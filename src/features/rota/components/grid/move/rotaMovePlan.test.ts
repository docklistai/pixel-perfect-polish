import { describe, expect, it } from "vitest";
import {
  getRotaMoveSourceRefusal,
  MOVE_AMBIGUOUS_SOURCE_REASON,
  MOVE_ARCHIVED_REASON,
  MOVE_INACTIVE_TARGET_REASON,
  MOVE_OUTSIDE_WEEK_REASON,
  MOVE_PENDING_REASON,
  MOVE_READ_ONLY_REASON,
  planRotaShiftMove,
  rotaMoveTargetTone,
  type RotaMovePlan,
} from "./rotaMovePlan";
import { makeCell, makeShift, makeTarget } from "../bulk/bulkTestFactories";
import type { ArmedMove } from "./rotaMoveApi";
import type { DraftShift, RotaDayIndex, StaffMember } from "../../../types";

const ACTIVE: StaffMember[] = [
  { id: "staff-a", name: "Ada", role: "Bar", hrs: "40h", img: 1, tone: "info" },
  { id: "staff-b", name: "Bo", role: "Bar", hrs: "40h", img: 2, tone: "info" },
];

function source(shift: Partial<DraftShift> = {}, shiftsInCell = 1): ArmedMove {
  const built = makeShift({ staffId: "staff-a", dayIndex: 1 as RotaDayIndex, ...shift });
  return {
    shift: built,
    cell: { row: built.staffId === null ? "open" : `staff:${built.staffId}`, day: built.dayIndex },
    shiftsInCell,
  };
}

function plan(overrides: Partial<Parameters<typeof planRotaShiftMove>[0]> = {}): RotaMovePlan {
  return planRotaShiftMove({
    source: source(),
    target: makeTarget({ key: { row: "staff:staff-a", day: 3 }, staffId: "staff-a" }),
    assignableStaff: ACTIVE,
    readOnly: false,
    weekIsEditable: true,
    mutationPending: false,
    dayCount: 7,
    ...overrides,
  });
}

/** Narrows to the allowed branch so a refusal fails loudly rather than silently. */
function expectMove(result: RotaMovePlan) {
  expect(result.kind).toBe("move");
  if (result.kind !== "move") throw new Error("expected a move");
  return result;
}

describe("planRotaShiftMove — supported moves", () => {
  it("moves a shift to another day for the same person", () => {
    const moved = expectMove(plan());
    expect(moved.patch).toEqual({ dayIndex: 3 });
  });

  it("moves a shift to another person on the same day", () => {
    const moved = expectMove(
      plan({ target: makeTarget({ key: { row: "staff:staff-b", day: 1 }, staffId: "staff-b" }) }),
    );
    expect(moved.patch).toEqual({ staffId: "staff-b" });
  });

  it("changes day and assignment together in one patch", () => {
    const moved = expectMove(
      plan({ target: makeTarget({ key: { row: "staff:staff-b", day: 5 }, staffId: "staff-b" }) }),
    );
    expect(moved.patch).toEqual({ dayIndex: 5, staffId: "staff-b" });
  });

  it("unassigns a shift dropped on the open row", () => {
    const moved = expectMove(
      plan({ target: makeTarget({ key: { row: "open", day: 1 }, openRow: true, staffId: null }) }),
    );
    expect(moved.patch).toEqual({ staffId: null });
  });

  it("assigns an open shift dropped on a staff row", () => {
    const moved = expectMove(
      plan({
        source: source({ staffId: null, status: "open", dayIndex: 2 as RotaDayIndex }),
        target: makeTarget({ key: { row: "staff:staff-b", day: 2 }, staffId: "staff-b" }),
      }),
    );
    expect(moved.patch).toEqual({ staffId: "staff-b" });
  });

  it("moves an open shift to another day without assigning it", () => {
    const moved = expectMove(
      plan({
        source: source({ staffId: null, status: "open", dayIndex: 2 as RotaDayIndex }),
        target: makeTarget({ key: { row: "open", day: 4 }, openRow: true, staffId: null }),
      }),
    );
    expect(moved.patch).toEqual({ dayIndex: 4 });
  });

  it("allows a destination that already holds a shift", () => {
    // Overlap is an acknowledgeable clash at publication, never a write-time
    // refusal — the same answer typing a second shift into the cell gives.
    const occupied = makeTarget({
      key: { row: "staff:staff-a", day: 3 },
      staffId: "staff-a",
      cell: makeCell([makeShift({ id: "other" })]),
    });
    expect(expectMove(plan({ target: occupied })).warning).toBeNull();
  });

  it("never carries times, break, role or department in the patch", () => {
    const moved = expectMove(plan());
    expect(Object.keys(moved.patch).sort()).toEqual(["dayIndex"]);
  });
});

describe("planRotaShiftMove — refusals and no-ops", () => {
  it("treats a drop back on the source cell as a no-op", () => {
    const armed = source();
    expect(
      plan({ source: armed, target: makeTarget({ key: armed.cell, staffId: "staff-a" }) }),
    ).toEqual({ kind: "noop" });
  });

  it("refuses a source cell holding more than one shift", () => {
    expect(plan({ source: source({}, 2) })).toEqual({
      kind: "refused",
      reason: MOVE_AMBIGUOUS_SOURCE_REASON,
    });
  });

  it("refuses a staff member who is no longer active", () => {
    const gone = makeTarget({ key: { row: "staff:staff-gone", day: 2 }, staffId: "staff-gone" });
    expect(plan({ target: gone })).toEqual({
      kind: "refused",
      reason: MOVE_INACTIVE_TARGET_REASON,
    });
  });

  it("refuses while the rota is read-only", () => {
    expect(plan({ readOnly: true })).toEqual({ kind: "refused", reason: MOVE_READ_ONLY_REASON });
  });

  it("refuses on an archived week", () => {
    expect(plan({ weekIsEditable: false })).toEqual({
      kind: "refused",
      reason: MOVE_ARCHIVED_REASON,
    });
  });

  it("refuses while another rota write is in flight", () => {
    expect(plan({ mutationPending: true })).toEqual({
      kind: "refused",
      reason: MOVE_PENDING_REASON,
    });
  });

  it("refuses a day outside the rendered week", () => {
    const beyond = makeTarget({ key: { row: "staff:staff-a", day: 7 }, staffId: "staff-a" });
    expect(plan({ target: beyond })).toEqual({
      kind: "refused",
      reason: MOVE_OUTSIDE_WEEK_REASON,
    });
  });

  it("refuses a drop that landed on no cell at all", () => {
    expect(plan({ target: null })).toEqual({ kind: "refused", reason: MOVE_OUTSIDE_WEEK_REASON });
  });
});

describe("planRotaShiftMove — advisory warnings", () => {
  const cases = [
    ["approved", "has approved leave — this will be a conflict"],
    ["pending", "has a pending leave request"],
  ] as const;

  it.each(cases)("reuses the shared leave advisory for %s leave", (leaveState, expected) => {
    const target = makeTarget({
      key: { row: "staff:staff-b", day: 4 },
      staffId: "staff-b",
      cell: makeCell([], { leaveState }),
    });
    expect(expectMove(plan({ target })).warning).toBe(expected);
  });

  it("warns without refusing when the target day is marked unavailable", () => {
    const target = makeTarget({
      key: { row: "staff:staff-b", day: 4 },
      staffId: "staff-b",
      cell: makeCell([], { availabilityHint: "unavailable" }),
    });
    const moved = expectMove(plan({ target }));
    expect(moved.warning).toBe("is marked unavailable");
    expect(moved.patch).toEqual({ dayIndex: 4, staffId: "staff-b" });
  });

  it("never warns about the open row, which belongs to nobody", () => {
    const target = makeTarget({
      key: { row: "open", day: 4 },
      openRow: true,
      staffId: null,
      cell: makeCell([], { leaveState: "approved" }),
    });
    expect(expectMove(plan({ target })).warning).toBeNull();
  });
});

describe("getRotaMoveSourceRefusal", () => {
  it("clears a shift that can move somewhere", () => {
    expect(
      getRotaMoveSourceRefusal({
        source: source(),
        readOnly: false,
        weekIsEditable: true,
        mutationPending: false,
      }),
    ).toBeNull();
  });

  it("refuses before anything is armed when the cell is ambiguous", () => {
    expect(
      getRotaMoveSourceRefusal({
        source: source({}, 2),
        readOnly: false,
        weekIsEditable: true,
        mutationPending: false,
      }),
    ).toBe(MOVE_AMBIGUOUS_SOURCE_REASON);
  });
});

describe("rotaMoveTargetTone", () => {
  it("maps each outcome to how the cell should present itself", () => {
    expect(rotaMoveTargetTone({ kind: "refused", reason: "nope" })).toBe("invalid");
    expect(rotaMoveTargetTone({ kind: "noop" })).toBe("none");
    expect(
      rotaMoveTargetTone({ kind: "move", patch: { dayIndex: 1 }, warning: null, targetLabel: "x" }),
    ).toBe("valid");
    expect(
      rotaMoveTargetTone({
        kind: "move",
        patch: { dayIndex: 1 },
        warning: "on leave",
        targetLabel: "x",
      }),
    ).toBe("warn");
  });
});
