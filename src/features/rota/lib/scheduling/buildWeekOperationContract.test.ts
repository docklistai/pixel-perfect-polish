import { describe, expect, it } from "vitest";
import { planBuildWeek } from "./buildWeekPlanner";
import { buildShiftSignature, normaliseRoleKey } from "./shiftSignature";
import { emptyAvailabilityFacts, type StaffSchedulingFact } from "./eligibility";
import type {
  BuildWeekPlannerInput,
  BuildWeekProposalBody,
  DemandRequirement,
  ExistingShiftFact,
  ProposalOperation,
} from "./buildWeekProposal";

/**
 * The operation contract: every precondition `rpc_apply_build_week_proposal`
 * enforces that is decidable from the emitted operation alone.
 *
 * These are the refusals the RPC raises before it looks at anything in the
 * database — week bounds, location, break length, overnight agreement, role
 * identity, allowed kinds — plus the ascending-staff emission order the phase 31
 * lock protocol depends on. Every one of them is a pure function of the
 * proposal, so a planner change that would be refused at apply time fails here
 * instead, without a database.
 *
 * Who may work a shift is the other half, in `buildWeekApplyParity.test.ts`.
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
const LOC = "loc-1";
const DEPT = "dept-kitchen";
const OTHER_DEPT = "dept-bar";
const ACTIVE_DEPARTMENTS = [DEPT, OTHER_DEPT];

function signature(overrides: Partial<Parameters<typeof buildShiftSignature>[0]> = {}) {
  return buildShiftSignature({
    workDate: WEEK[0]!,
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

function plan(input: Partial<BuildWeekPlannerInput> = {}): BuildWeekProposalBody {
  return planBuildWeek({
    dayIsoDates: WEEK,
    locationId: LOC,
    source: { kind: "template", label: "Contract template" },
    demand: [],
    existingShifts: [],
    staff: [],
    availability: emptyAvailabilityFacts(),
    ...input,
  });
}

function signatureOf(op: ProposalOperation) {
  return op.kind === "assign-open" ? op.expected : op.signature;
}

function assignedStaffIds(body: BuildWeekProposalBody): string[] {
  return body.operations.flatMap((op) => (op.kind === "create-open" ? [] : [op.staffId]));
}

/** Each named SQL refusal, re-stated. An empty list means the RPC would proceed. */
function sqlPreconditionFailures(body: BuildWeekProposalBody): string[] {
  const failures: string[] = [];
  for (const op of body.operations) {
    // "This proposal contains an operation that is not allowed."
    if (!["create-open", "create-assigned", "assign-open"].includes(op.kind)) {
      failures.push(`disallowed kind ${String(op.kind)}`);
      continue;
    }
    const sig = signatureOf(op);
    // "A shift in this proposal falls outside the week being built."
    if (!WEEK.includes(sig.workDate)) failures.push(`${sig.workDate} outside the week`);
    // "A shift in this proposal has an unusable break length."
    if (sig.breakMinutes < 0 || sig.breakMinutes > 1440) failures.push("unusable break length");
    // "A shift in this proposal belongs to a different location."
    if (sig.locationId !== LOC) failures.push("wrong location");
    // "A shift in this proposal has inconsistent overnight times."
    if (sig.overnight !== sig.endLocal <= sig.startLocal) failures.push("overnight disagrees");
    // "A department in this proposal is no longer active."
    if (!ACTIVE_DEPARTMENTS.includes(sig.departmentId)) failures.push("inactive department");
    if (op.kind !== "assign-open") {
      // "A shift in this proposal has an unusable role name."
      if (op.roleName.trim() === "" || op.roleName.length > 120) failures.push("unusable roleName");
      // "…names a role that does not match its own identity."
      if (normaliseRoleKey(op.roleName) !== normaliseRoleKey(sig.roleKey)) {
        failures.push(`roleName "${op.roleName}" does not match roleKey "${sig.roleKey}"`);
      }
    }
  }
  return failures;
}

/** Phase 31 lock order: assignments first, then creations, staff id ascending. */
function lockOrderViolations(body: BuildWeekProposalBody): string[] {
  const rank = (op: ProposalOperation) => (op.kind === "assign-open" ? 0 : 1);
  const staffOf = (op: ProposalOperation) => (op.kind === "create-open" ? "" : op.staffId);
  const violations: string[] = [];
  for (let index = 1; index < body.operations.length; index += 1) {
    const previous = body.operations[index - 1]!;
    const current = body.operations[index]!;
    if (rank(previous) > rank(current))
      violations.push(`${previous.kind} emitted after ${current.kind}`);
    else if (rank(previous) === rank(current) && staffOf(previous) > staffOf(current)) {
      violations.push(`${staffOf(previous)} emitted before ${staffOf(current)}`);
    }
  }
  return violations;
}

function expectSqlAcceptable(body: BuildWeekProposalBody) {
  expect(sqlPreconditionFailures(body)).toEqual([]);
  expect(lockOrderViolations(body)).toEqual([]);
}

describe("the contract checks themselves detect a bad proposal", () => {
  // Without this, an empty failure list would prove nothing.
  it("catches an out-of-week date, a foreign location and a mismatched role name", () => {
    const bad: BuildWeekProposalBody = {
      operations: [
        {
          kind: "create-assigned",
          signature: signature({ workDate: "2026-09-01", locationId: "loc-2" }),
          roleName: "Waiter",
          staffId: "s1",
          reason: "",
        },
      ],
      sections: {
        missingDemand: [],
        proposedAssignments: [],
        preserved: { assignedShifts: 0, openShifts: 0, openShiftsBeingAssigned: 0 },
        unresolvedOpen: [],
      },
      warnings: [],
      explanations: [],
    };
    expect(sqlPreconditionFailures(bad)).toEqual([
      "2026-09-01 outside the week",
      "wrong location",
      'roleName "Waiter" does not match roleKey "chef"',
    ]);
  });

  it("catches operations emitted out of the lock order", () => {
    const body = plan({ demand: [demand(2)], staff: [staff("s1"), staff("s2")] });
    const reversed: BuildWeekProposalBody = {
      ...body,
      operations: [...body.operations].reverse(),
    };
    expect(lockOrderViolations(reversed)).not.toEqual([]);
    expect(lockOrderViolations(body)).toEqual([]);
  });
});

describe("staff status, departments and location references", () => {
  it("never proposes an offboarded person", () => {
    const body = plan({
      demand: [demand(1)],
      staff: [staff("s1", "Chef", { active: false }), staff("s2")],
    });
    expect(assignedStaffIds(body)).toEqual(["s2"]);
    expectSqlAcceptable(body);
  });

  it("creates the shift open when every role holder is offboarded", () => {
    const body = plan({ demand: [demand(1)], staff: [staff("s1", "Chef", { active: false })] });
    expect(body.operations).toHaveLength(1);
    expect(body.operations[0]!.kind).toBe("create-open");
    // Inactive staff are not counted among the reasons the shift is stuck.
    expect(body.sections.unresolvedOpen[0]!.reason).toContain("No active staff hold");
    expectSqlAcceptable(body);
  });

  it("carries the shift's own department, not the person's, into every operation", () => {
    const body = plan({
      demand: [demand(1, { departmentId: DEPT })],
      staff: [staff("s1", "Chef", { departmentId: OTHER_DEPT })],
    });
    expect(assignedStaffIds(body)).toEqual(["s1"]);
    expect(signatureOf(body.operations[0]!).departmentId).toBe(DEPT);
    expectSqlAcceptable(body);
  });

  it("prefers a matching department only between otherwise equal candidates", () => {
    const body = plan({
      demand: [demand(1, { departmentId: DEPT })],
      staff: [staff("s1", "Chef", { departmentId: OTHER_DEPT }), staff("s2", "Chef")],
    });
    expect(assignedStaffIds(body)).toEqual(["s2"]);
    expectSqlAcceptable(body);
  });

  it("keeps every signature on the week's own location", () => {
    const body = plan({ demand: [demand(2)], staff: [staff("s1"), staff("s2")] });
    for (const op of body.operations) expect(signatureOf(op).locationId).toBe(LOC);
    expectSqlAcceptable(body);
  });

  it("keeps an overnight signature consistent with its own times", () => {
    const body = plan({
      demand: [demand(1, { start: "22:00", end: "02:00" })],
      staff: [staff("s1")],
    });
    expect(signatureOf(body.operations[0]!).overnight).toBe(true);
    expectSqlAcceptable(body);
  });
});

describe("contracted minutes are neutral when null", () => {
  it("neither favours nor penalises somebody with no contracted figure", () => {
    // Both are eligible and equally loaded, so the tie must fall through to
    // staff id rather than to whoever happens to have a contract recorded.
    const withContract = staff("s2", "Chef", { contractedMinutesPerWeek: 2400 });
    const withoutContract = staff("s1", "Chef", { contractedMinutesPerWeek: null });
    const body = plan({ demand: [demand(1)], staff: [withContract, withoutContract] });
    expect(assignedStaffIds(body)).toEqual(["s1"]);
    const reversed = plan({ demand: [demand(1)], staff: [withoutContract, withContract] });
    expect(assignedStaffIds(reversed)).toEqual(["s1"]);
    expectSqlAcceptable(body);
  });

  it("still spreads work by scheduled minutes when nobody has a contract", () => {
    const body = plan({
      demand: [demand(1), demand(1, { start: "17:00", end: "23:00" })],
      existingShifts: [existing("busy", "s1", { start: "05:00", end: "08:00" })],
      staff: [staff("s1"), staff("s2")],
    });
    // Operations are emitted in lock order, not assignment order, so this is
    // asserted per shift rather than by position.
    const assignmentFor = (start: string) =>
      body.sections.proposedAssignments.find((entry) => entry.signature.startLocal === start)
        ?.staffId;
    expect(assignmentFor("09:00")).toBe("s2");
    expect(assignmentFor("17:00")).toBe("s1");
    expectSqlAcceptable(body);
  });

  it("is never a working-time limit — headroom cannot exclude anybody", () => {
    // Far over a small contract, and still assigned: contracted minutes are a
    // balancing signal, and the SQL validator does not read them at all.
    const body = plan({
      demand: [demand(1)],
      staff: [staff("s1", "Chef", { contractedMinutesPerWeek: 60 })],
    });
    expect(assignedStaffIds(body)).toEqual(["s1"]);
    expectSqlAcceptable(body);
  });
});

describe("the proposal a manager approves is one SQL can apply", () => {
  it("emits only the three allowed kinds, in lock order", () => {
    // Four of the day shift against three people, so the last has nobody left
    // and must be created open — all three kinds in one proposal.
    const body = plan({
      demand: [demand(4), demand(1, { start: "18:00", end: "23:00" })],
      existingShifts: [
        existing("open-1", null),
        existing("open-2", null, { start: "18:00", end: "23:00" }),
      ],
      staff: [staff("s3"), staff("s1"), staff("s2")],
    });
    expect(new Set(body.operations.map((op) => op.kind))).toEqual(
      new Set(["assign-open", "create-assigned", "create-open"]),
    );
    expectSqlAcceptable(body);
  });

  it("never emits an operation that could delete or alter an assigned shift", () => {
    const body = plan({
      demand: [demand(1)],
      existingShifts: [existing("kept", "s1"), existing("surplus", "s1")],
      staff: [staff("s1")],
    });
    expect(body.operations).toEqual([]);
    expect(body.warnings.map((warning) => warning.code)).toContain("excess-demand");
    expect(body.sections.preserved.assignedShifts).toBe(2);
  });

  it("is byte-identical for identical inputs, whatever order they arrive in", () => {
    const roster = [staff("s1"), staff("s2")];
    const first = plan({ demand: [demand(2)], staff: roster });
    const second = plan({ demand: [demand(1), demand(1)], staff: [...roster].reverse() });
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });

  it("stays within the RPC's 500-operation ceiling for a plausible week", () => {
    // Seven days of ten shifts is a large real week; the RPC refuses above 500.
    const heavy = WEEK.flatMap((workDate) => [demand(10, { workDate })]);
    const body = plan({ demand: heavy, staff: [staff("s1")] });
    expect(body.operations.length).toBeLessThanOrEqual(500);
    expectSqlAcceptable(body);
  });
});
