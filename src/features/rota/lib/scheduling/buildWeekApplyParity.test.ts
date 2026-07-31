import { describe, expect, it } from "vitest";
import { planBuildWeek } from "./buildWeekPlanner";
import { buildShiftSignature, normaliseRoleKey } from "./shiftSignature";
import { isoWeekday } from "../recurringDayOffClashes";
import { datesTouchedByInterval, intervalConflict } from "./calendarInterval";
import {
  emptyAvailabilityFacts,
  type AvailabilityFacts,
  type CommittedShift,
  type StaffSchedulingFact,
} from "./eligibility";
import type {
  BuildWeekPlannerInput,
  BuildWeekProposalBody,
  DemandRequirement,
  ExistingShiftFact,
} from "./buildWeekProposal";

/**
 * Planner / apply parity: who may work a shift.
 *
 * Two engines have to agree: the TypeScript planner that proposes, and
 * `rpc_apply_build_week_proposal` that validates. They are written in different
 * languages against different data shapes, so agreement is something to test,
 * not something to assume.
 *
 * The invariant is one-directional and deliberately so: **a proposal the planner
 * accepts must survive SQL validation, and anything the planner treats as a hard
 * exclusion must also be refused by SQL.** The reverse is not required — SQL is
 * the authority and sees the world at apply time, so it is allowed to be
 * stricter.
 *
 * `proposesAnyExcludedAssignment` below re-derives the RPC's availability rules
 * from its own SQL clauses (isodow-1 weekdays, both leave statuses, touched
 * dates including the day an overnight shift ends on, workspace-wide overlap)
 * rather than calling the planner's own eligibility code, so the two sides are
 * genuinely compared rather than one asserting against itself.
 *
 * The database-state half — that the RPC really refuses each of these — is
 * asserted against real Postgres in
 * `supabase/tests/phase47_build_week_apply_tests.sql`. The output-shape half is
 * in `buildWeekOperationContract.test.ts`. The three are meant to be read
 * together.
 */

const WEEK = [
  "2026-08-03",
  "2026-08-04",
  "2026-08-05",
  "2026-08-06",
  "2026-08-07",
  "2026-08-08",
  "2026-08-09",
];
const WEEK_START = WEEK[0]!;
const LOC = "loc-1";
const DEPT = "dept-kitchen";

function signature(overrides: Partial<Parameters<typeof buildShiftSignature>[0]> = {}) {
  return buildShiftSignature({
    workDate: WEEK_START,
    start: "09:00",
    end: "17:00",
    role: "Chef",
    departmentId: DEPT,
    locationId: LOC,
    breakMinutes: 30,
    ...overrides,
  });
}

function demand(
  required: number,
  overrides: Partial<Parameters<typeof buildShiftSignature>[0]> = {},
): DemandRequirement {
  return { signature: signature(overrides), required, roleName: overrides.role ?? "Chef" };
}

function existing(id: string, staffId: string | null, overrides = {}): ExistingShiftFact {
  return { id, signature: signature(overrides), staffId };
}

function staff(
  id: string,
  roleName = "Chef",
  overrides: Partial<StaffSchedulingFact> = {},
): StaffSchedulingFact {
  return {
    id,
    name: `Staff ${id}`,
    roleKey: normaliseRoleKey(roleName),
    departmentId: DEPT,
    active: true,
    contractedMinutesPerWeek: null,
    ...overrides,
  };
}

function availability(overrides: Partial<AvailabilityFacts> = {}): AvailabilityFacts {
  return { ...emptyAvailabilityFacts(), ...overrides };
}

function plan(input: Partial<BuildWeekPlannerInput> = {}): BuildWeekProposalBody {
  return planBuildWeek({
    dayIsoDates: WEEK,
    locationId: LOC,
    source: { kind: "template", label: "Parity template" },
    demand: [],
    existingShifts: [],
    staff: [],
    availability: emptyAvailabilityFacts(),
    ...input,
  });
}

/** Staff ids this proposal would assign somebody to, in emission order. */
function assignedStaffIds(body: BuildWeekProposalBody): string[] {
  return body.operations.flatMap((op) => (op.kind === "create-open" ? [] : [op.staffId]));
}

/**
 * `rpc_internal_assert_build_week_assignable`, re-stated against the facts the
 * planner was given. Returns true if any assignment in this proposal would be
 * refused by the database — which must never happen.
 */
function proposesAnyExcludedAssignment(
  body: BuildWeekProposalBody,
  facts: AvailabilityFacts,
  staffById: ReadonlyMap<string, StaffSchedulingFact>,
  workspaceShifts: readonly CommittedShift[] = [],
): boolean {
  return body.operations.some((op) => {
    if (op.kind === "create-open") return false;
    const sig = op.kind === "assign-open" ? op.expected : op.signature;
    const member = staffById.get(op.staffId);
    // "Someone in this proposal is no longer active." / "…does not hold the role"
    if (!member || !member.active) return true;
    if (normaliseRoleKey(member.roleKey) !== normaliseRoleKey(sig.roleKey)) return true;

    const times = { workDate: sig.workDate, start: sig.startLocal, end: sig.endLocal };
    const dates = datesTouchedByInterval(times);
    if (dates.length === 0) return true;
    for (const date of dates) {
      // "…now has leave on that day" covers approved AND pending.
      if (facts.approvedLeaveDatesByStaff.get(op.staffId)?.has(date)) return true;
      if (facts.pendingLeaveDatesByStaff.get(op.staffId)?.has(date)) return true;
      // "…is now marked unavailable."
      if (facts.unavailableDatesByStaff.get(op.staffId)?.has(date)) return true;
      // "…has a regular day off then." SQL: extract(isodow) - 1, i.e. 0 = Monday.
      if (facts.recurringWeekdaysByStaff.get(op.staffId)?.has(isoWeekday(date))) return true;
    }
    // "…would be working two shifts at once." SQL compares against every shift
    // the person holds in the workspace — no week filter, no location filter.
    const excluded = op.kind === "assign-open" ? op.shiftId : undefined;
    return workspaceShifts.some(
      (other) =>
        other.staffId === op.staffId &&
        other.shiftId !== excluded &&
        intervalConflict(times, other.times) !== null,
    );
  });
}

describe("role identity is normalized the same way on both sides", () => {
  it("assigns a person whose role differs only in case and spacing", () => {
    const roster = [staff("s1", "  hEaD   chef ")];
    const body = plan({ demand: [demand(1, { role: "Head Chef" })], staff: roster });
    expect(assignedStaffIds(body)).toEqual(["s1"]);
    // Display and identity stay separate values, and SQL checks they agree.
    const created = body.operations[0]!;
    expect(created.kind).toBe("create-assigned");
    if (created.kind === "create-assigned") {
      expect(created.roleName).toBe("Head Chef");
      expect(normaliseRoleKey(created.roleName)).toBe(created.signature.roleKey);
    }
  });

  it("never treats a shorter role as a longer one — punctuation is significant", () => {
    const roster = [staff("s1", "Barista"), staff("s2", "Bar/Kitchen")];
    const body = plan({ demand: [demand(1, { role: "Bar" })], staff: roster });
    expect(assignedStaffIds(body)).toEqual([]);
    expect(body.operations[0]!.kind).toBe("create-open");
    expect(body.warnings.some((warning) => warning.code === "unstaffable-role")).toBe(true);
  });

  it("resolves ambiguity by exact identity rather than by preference", () => {
    // "Bar" and "Bar Kitchen" are different roles, so there is nothing to guess
    // between: only the exact holder is ever a candidate.
    const roster = [staff("s1", "Bar"), staff("s2", "Bar Kitchen")];
    const body = plan({ demand: [demand(1, { role: "bar" })], staff: roster });
    expect(assignedStaffIds(body)).toEqual(["s1"]);
  });

  it("refuses a role nobody holds rather than assigning the nearest match", () => {
    const roster = [staff("s1", "Chef")];
    const body = plan({ demand: [demand(1, { role: "Chef de Partie" })], staff: roster });
    expect(assignedStaffIds(body)).toEqual([]);
  });
});

describe("leave is a hard exclusion in both directions", () => {
  const roster = [staff("s1")];
  const staffById = new Map(roster.map((member) => [member.id, member]));

  it("refuses approved leave", () => {
    const facts = availability({
      approvedLeaveDatesByStaff: new Map([["s1", new Set([WEEK_START])]]),
    });
    const body = plan({ demand: [demand(1)], staff: roster, availability: facts });
    expect(assignedStaffIds(body)).toEqual([]);
    expect(proposesAnyExcludedAssignment(body, facts, staffById)).toBe(false);
    expect(body.sections.unresolvedOpen[0]!.exclusions).toEqual([
      { kind: "approved-leave", count: 1 },
    ]);
  });

  it("refuses pending leave — SQL's status filter is ('approved','pending') too", () => {
    const facts = availability({
      pendingLeaveDatesByStaff: new Map([["s1", new Set([WEEK_START])]]),
    });
    const body = plan({ demand: [demand(1)], staff: roster, availability: facts });
    expect(assignedStaffIds(body)).toEqual([]);
    expect(proposesAnyExcludedAssignment(body, facts, staffById)).toBe(false);
    expect(body.sections.unresolvedOpen[0]!.exclusions).toEqual([
      { kind: "pending-leave", count: 1 },
    ]);
  });

  it("leaves an existing assignment that clashes with leave exactly as it is", () => {
    const facts = availability({
      approvedLeaveDatesByStaff: new Map([["s1", new Set([WEEK_START])]]),
    });
    const body = plan({
      demand: [demand(1)],
      existingShifts: [existing("shift-1", "s1")],
      staff: roster,
      availability: facts,
    });
    // No operation kind can express removing or altering it, so there is nothing
    // for SQL to validate — only a warning for the manager.
    expect(body.operations).toEqual([]);
    expect(body.warnings.map((warning) => warning.code)).toContain("existing-assignment-clash");
    expect(body.sections.preserved.assignedShifts).toBe(1);
  });
});

describe("recurring days off and one-off unavailability", () => {
  const roster = [staff("s1")];
  const staffById = new Map(roster.map((member) => [member.id, member]));

  it("refuses an approved recurring day off, counting Monday as 0 like SQL isodow-1", () => {
    expect(isoWeekday(WEEK_START)).toBe(0); // 2026-08-03 is a Monday.
    const facts = availability({ recurringWeekdaysByStaff: new Map([["s1", new Set([0])]]) });
    const body = plan({ demand: [demand(1)], staff: roster, availability: facts });
    expect(assignedStaffIds(body)).toEqual([]);
    expect(proposesAnyExcludedAssignment(body, facts, staffById)).toBe(false);
  });

  it("does not refuse a different weekday", () => {
    const facts = availability({ recurringWeekdaysByStaff: new Map([["s1", new Set([2])]]) });
    const body = plan({ demand: [demand(1)], staff: roster, availability: facts });
    expect(assignedStaffIds(body)).toEqual(["s1"]);
    expect(proposesAnyExcludedAssignment(body, facts, staffById)).toBe(false);
  });

  it("refuses a one-off unavailability on the day", () => {
    const facts = availability({
      unavailableDatesByStaff: new Map([["s1", new Set([WEEK_START])]]),
    });
    const body = plan({ demand: [demand(1)], staff: roster, availability: facts });
    expect(assignedStaffIds(body)).toEqual([]);
    expect(proposesAnyExcludedAssignment(body, facts, staffById)).toBe(false);
  });

  it("refuses an overnight shift blocked only on the day it ends on", () => {
    // SQL builds touched_dates from starts_at to ends_at - 1 second, so the
    // second day counts. A same-day-only check would wrongly allow this.
    const facts = availability({ unavailableDatesByStaff: new Map([["s1", new Set([WEEK[1]!])]]) });
    const body = plan({
      demand: [demand(1, { start: "22:00", end: "02:00" })],
      staff: roster,
      availability: facts,
    });
    expect(assignedStaffIds(body)).toEqual([]);
    expect(proposesAnyExcludedAssignment(body, facts, staffById)).toBe(false);
  });

  it("still allows a shift ending exactly at midnight on an otherwise blocked day", () => {
    // Ends at 00:00, which SQL's "- 1 second" keeps on the first day.
    const facts = availability({ unavailableDatesByStaff: new Map([["s1", new Set([WEEK[1]!])]]) });
    const body = plan({
      demand: [demand(1, { start: "16:00", end: "00:00" })],
      staff: roster,
      availability: facts,
    });
    expect(assignedStaffIds(body)).toEqual(["s1"]);
    expect(proposesAnyExcludedAssignment(body, facts, staffById)).toBe(false);
  });
});

describe("interval conflicts, same-day and overnight", () => {
  const roster = [staff("s1")];
  const staffById = new Map(roster.map((member) => [member.id, member]));

  it("will not give one person two overlapping shifts in the same pass", () => {
    const body = plan({
      demand: [demand(1), demand(1, { start: "16:00", end: "23:00" })],
      staff: roster,
    });
    expect(assignedStaffIds(body)).toEqual(["s1"]);
    expect(body.operations.filter((op) => op.kind === "create-open")).toHaveLength(1);
  });

  it("treats end-to-start as a clean handover, matching SQL's half-open overlap", () => {
    // SQL: other.starts_at < p_ends_at and p_starts_at < other.ends_at.
    const body = plan({
      demand: [demand(1), demand(1, { start: "17:00", end: "23:00" })],
      staff: roster,
    });
    expect(assignedStaffIds(body)).toEqual(["s1", "s1"]);
  });

  it("respects an existing assignment that runs past midnight into the next day", () => {
    const body = plan({
      demand: [demand(1, { workDate: WEEK[1]!, start: "00:00", end: "08:00" })],
      existingShifts: [existing("night", "s1", { start: "22:00", end: "02:00" })],
      staff: roster,
    });
    expect(assignedStaffIds(body)).toEqual([]);
  });

  it("refuses somebody already working elsewhere in the workspace that day", () => {
    // The gap this closes: SQL checks overlap against every shift the person
    // holds in the workspace — any week, any location. Without the external
    // commitments the planner would propose this, the RPC would refuse it, and
    // because the planner is deterministic the "Build it again" the refusal
    // suggests would produce the identical proposal and the identical refusal.
    const workspaceShifts: CommittedShift[] = [
      {
        shiftId: "other-location-shift",
        staffId: "s1",
        times: { workDate: WEEK_START, start: "12:00", end: "20:00" },
      },
    ];
    const body = plan({
      demand: [demand(1)],
      staff: roster,
      externalCommitments: workspaceShifts,
    });
    expect(assignedStaffIds(body)).toEqual([]);
    expect(body.operations[0]!.kind).toBe("create-open");
    expect(
      proposesAnyExcludedAssignment(body, emptyAvailabilityFacts(), staffById, workspaceShifts),
    ).toBe(false);
  });

  it("refuses somebody whose previous week's overnight shift runs into this one", () => {
    const workspaceShifts: CommittedShift[] = [
      {
        shiftId: "previous-week-night",
        staffId: "s1",
        times: { workDate: "2026-08-02", start: "22:00", end: "10:00" },
      },
    ];
    const body = plan({
      demand: [demand(1)],
      staff: roster,
      externalCommitments: workspaceShifts,
    });
    expect(assignedStaffIds(body)).toEqual([]);
    expect(
      proposesAnyExcludedAssignment(body, emptyAvailabilityFacts(), staffById, workspaceShifts),
    ).toBe(false);
  });

  it("does not refuse a neighbouring shift that merely touches the boundary", () => {
    const workspaceShifts: CommittedShift[] = [
      {
        shiftId: "previous-week-evening",
        staffId: "s1",
        times: { workDate: "2026-08-02", start: "22:00", end: "09:00" },
      },
    ];
    const body = plan({
      demand: [demand(1)],
      staff: roster,
      externalCommitments: workspaceShifts,
    });
    expect(assignedStaffIds(body)).toEqual(["s1"]);
    expect(
      proposesAnyExcludedAssignment(body, emptyAvailabilityFacts(), staffById, workspaceShifts),
    ).toBe(false);
  });

  it("does not count work outside the week toward the load-balancing signal", () => {
    // External commitments are exclusion input only. If they counted as load,
    // s1 would look busier than s2 and lose a slot they are entitled to.
    const pair = [staff("s1"), staff("s2")];
    const body = plan({
      demand: [demand(1)],
      staff: pair,
      externalCommitments: [
        {
          shiftId: "far-away",
          staffId: "s1",
          times: { workDate: "2026-08-02", start: "01:00", end: "07:00" },
        },
      ],
    });
    expect(assignedStaffIds(body)).toEqual(["s1"]);
  });
});
