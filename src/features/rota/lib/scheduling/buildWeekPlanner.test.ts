import { describe, expect, it } from "vitest";
import { planBuildWeek } from "./buildWeekPlanner";
import { buildShiftSignature } from "./shiftSignature";
import { emptyAvailabilityFacts, type StaffSchedulingFact } from "./eligibility";
import type {
  BuildWeekPlannerInput,
  DemandRequirement,
  ExistingShiftFact,
} from "./buildWeekProposal";

const WEEK = [
  "2026-07-27",
  "2026-07-28",
  "2026-07-29",
  "2026-07-30",
  "2026-07-31",
  "2026-08-01",
  "2026-08-02",
];
const LOC = "loc-1";
const DEPT = "dept-1";

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
  return {
    signature: signature(overrides),
    required,
    roleName: overrides.role ?? "Chef",
  };
}

function existing(id: string, staffId: string | null, overrides = {}): ExistingShiftFact {
  return { id, signature: signature(overrides), staffId };
}

function staff(id: string, roleKey = "chef", overrides: Partial<StaffSchedulingFact> = {}) {
  return {
    id,
    name: `Staff ${id}`,
    roleKey,
    departmentId: DEPT,
    active: true,
    contractedMinutesPerWeek: null,
    ...overrides,
  } satisfies StaffSchedulingFact;
}

function plan(input: Partial<BuildWeekPlannerInput> = {}) {
  return planBuildWeek({
    dayIsoDates: WEEK,
    locationId: LOC,
    source: { kind: "template", label: "Test template" },
    demand: [],
    existingShifts: [],
    staff: [],
    availability: emptyAvailabilityFacts(),
    ...input,
  });
}

describe("no demand source means no generation", () => {
  it("produces no operations from empty demand and an empty week", () => {
    const result = plan();
    expect(result.operations).toEqual([]);
    expect(result.sections.missingDemand).toEqual([]);
  });
});

describe("demand is reconciled by counted signature", () => {
  it("creates only the shortfall", () => {
    const result = plan({ demand: [demand(3)], existingShifts: [existing("e1", null)] });
    expect(result.operations.filter((op) => op.kind.startsWith("create"))).toHaveLength(2);
    expect(result.sections.missingDemand[0]).toMatchObject({ required: 3, existing: 1, create: 2 });
  });

  it("counts an assigned shift as demand already met", () => {
    const result = plan({ demand: [demand(1)], existingShifts: [existing("e1", "a")] });
    expect(result.operations.filter((op) => op.kind.startsWith("create"))).toHaveLength(0);
  });

  it("keeps legitimate identical shifts by creating the full count", () => {
    const result = plan({ demand: [demand(3)] });
    expect(result.operations).toHaveLength(3);
    expect(result.operations.every((op) => op.kind === "create-open")).toBe(true);
  });

  it("treats shifts differing in any signature field as separate demand", () => {
    const result = plan({ demand: [demand(1), demand(1, { start: "10:00" })] });
    expect(result.operations).toHaveLength(2);
  });
});

describe("excess demand warns, never deletes", () => {
  it("reports surplus and emits no removal", () => {
    const result = plan({
      demand: [demand(1)],
      existingShifts: [existing("e1", null), existing("e2", null), existing("e3", null)],
    });
    const warning = result.warnings.find((entry) => entry.code === "excess-demand");
    expect(warning?.message).toContain("Build never removes a shift");
    expect(result.operations.some((op) => op.kind.includes("remove"))).toBe(false);
  });

  it("has no operation kind capable of deleting or reassigning", () => {
    const result = plan({
      demand: [demand(1)],
      existingShifts: [existing("e1", "a"), existing("e2", "b")],
      staff: [staff("a"), staff("b")],
    });
    for (const op of result.operations) {
      expect(["create-open", "create-assigned", "assign-open"]).toContain(op.kind);
    }
  });
});

describe("assignment", () => {
  it("assigns an existing open shift rather than creating a duplicate", () => {
    const result = plan({
      demand: [demand(1)],
      existingShifts: [existing("e1", null)],
      staff: [staff("a")],
    });
    expect(result.operations).toHaveLength(1);
    expect(result.operations[0]).toMatchObject({
      kind: "assign-open",
      shiftId: "e1",
      staffId: "a",
    });
  });

  it("carries the expected signature so apply can prove it is the reviewed shift", () => {
    const result = plan({
      demand: [demand(1)],
      existingShifts: [existing("e1", null)],
      staff: [staff("a")],
    });
    const op = result.operations[0]!;
    expect(op.kind === "assign-open" && op.expected.roleKey).toBe("chef");
  });

  it("creates an assigned shift when demand exceeds existing open shifts", () => {
    const result = plan({ demand: [demand(1)], staff: [staff("a")] });
    expect(result.operations[0]).toMatchObject({ kind: "create-assigned", staffId: "a" });
  });

  it("requires exact role identity", () => {
    const result = plan({ demand: [demand(1)], staff: [staff("a", "barista")] });
    expect(result.operations[0]!.kind).toBe("create-open");
    expect(result.sections.unresolvedOpen[0]!.reason).toContain("No active staff hold");
  });

  it("does not double-book one person across two overlapping slots", () => {
    const result = plan({ demand: [demand(2)], staff: [staff("a")] });
    expect(result.operations.filter((op) => op.kind === "create-assigned")).toHaveLength(1);
    expect(result.operations.filter((op) => op.kind === "create-open")).toHaveLength(1);
  });

  it("spreads two non-overlapping slots across two people before doubling up", () => {
    const result = plan({
      demand: [demand(1), demand(1, { workDate: WEEK[1] })],
      staff: [staff("a"), staff("b")],
    });
    const assigned = result.operations.filter((op) => op.kind === "create-assigned");
    expect(
      new Set(assigned.map((op) => (op.kind === "create-assigned" ? op.staffId : ""))),
    ).toEqual(new Set(["a", "b"]));
  });

  it("excludes approved leave and says so", () => {
    const availability = emptyAvailabilityFacts();
    availability.approvedLeaveDatesByStaff.set("a", new Set([WEEK[0]!]));
    const result = plan({ demand: [demand(1)], staff: [staff("a")], availability });
    expect(result.operations[0]!.kind).toBe("create-open");
    expect(result.sections.unresolvedOpen[0]!.reason).toContain("approved leave");
  });

  it("excludes pending leave too", () => {
    const availability = emptyAvailabilityFacts();
    availability.pendingLeaveDatesByStaff.set("a", new Set([WEEK[0]!]));
    const result = plan({ demand: [demand(1)], staff: [staff("a")], availability });
    expect(result.operations[0]!.kind).toBe("create-open");
  });

  it("checks both dates of an overnight shift", () => {
    const availability = emptyAvailabilityFacts();
    availability.approvedLeaveDatesByStaff.set("a", new Set([WEEK[1]!]));
    const result = plan({
      demand: [demand(1, { start: "22:00", end: "02:00" })],
      staff: [staff("a")],
      availability,
    });
    expect(result.operations[0]!.kind).toBe("create-open");
  });
});

describe("existing work is preserved and warned", () => {
  it("never alters an assigned shift, but warns about a leave clash", () => {
    const availability = emptyAvailabilityFacts();
    availability.approvedLeaveDatesByStaff.set("a", new Set([WEEK[0]!]));
    const result = plan({
      demand: [demand(1)],
      existingShifts: [existing("e1", "a")],
      staff: [staff("a")],
      availability,
    });
    expect(result.operations).toEqual([]);
    const warning = result.warnings.find((entry) => entry.code === "existing-assignment-clash");
    expect(warning?.message).toContain("left this shift exactly as it is");
  });

  it("summarises what is preserved", () => {
    const result = plan({
      demand: [demand(2)],
      existingShifts: [existing("e1", "a"), existing("e2", null)],
      staff: [staff("a"), staff("b")],
    });
    expect(result.sections.preserved).toMatchObject({ assignedShifts: 1, openShifts: 1 });
    expect(result.sections.preserved.openShiftsBeingAssigned).toBe(1);
  });
});

describe("determinism", () => {
  const input = {
    demand: [demand(2), demand(1, { workDate: WEEK[2], role: "Bar" })],
    existingShifts: [existing("e2", null), existing("e1", null)],
    staff: [staff("c"), staff("a"), staff("b"), staff("d", "bar")],
  };

  it("produces an identical proposal however the inputs are ordered", () => {
    const forward = plan(input);
    const reversed = plan({
      demand: [...input.demand].reverse(),
      existingShifts: [...input.existingShifts].reverse(),
      staff: [...input.staff].reverse(),
    });
    expect(JSON.stringify(reversed.operations)).toBe(JSON.stringify(forward.operations));
  });

  it("produces an identical proposal on repeated runs", () => {
    expect(JSON.stringify(plan(input))).toBe(JSON.stringify(plan(input)));
  });

  it("emits assignments to existing shifts before creations", () => {
    const result = plan(input);
    const firstCreate = result.operations.findIndex((op) => op.kind !== "assign-open");
    const lastAssign = result.operations.map((op) => op.kind).lastIndexOf("assign-open");
    if (firstCreate !== -1 && lastAssign !== -1) expect(lastAssign).toBeLessThan(firstCreate);
  });

  it("orders operations by ascending staff id, matching the database lock protocol", () => {
    const result = plan({
      demand: [demand(1, { workDate: WEEK[3] })],
      staff: [staff("z"), staff("a")],
    });
    const assigned = result.operations.filter((op) => op.kind === "create-assigned");
    expect(assigned[0]).toMatchObject({ staffId: "a" });
  });
});
