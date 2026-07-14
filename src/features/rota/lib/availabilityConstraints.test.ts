import { describe, expect, it } from "vitest";
import type { DraftShift, RotaGridStaffRow, StaffMember } from "../types";
import {
  applyAvailabilityHints,
  findAvailabilityConstraintClashes,
  type ApprovedAvailabilityConstraints,
} from "./availabilityConstraints";

const staff: StaffMember = {
  id: "staff-1",
  name: "Olivia Bennett",
  role: "Server",
  hrs: "30h",
  img: 0,
  tone: "info",
};

function constraints(overrides: Partial<ApprovedAvailabilityConstraints> = {}) {
  return {
    recurringByStaff: new Map<string, Set<number>>(),
    unavailableDatesByStaff: new Map<string, Set<string>>(),
    ...overrides,
  };
}

function row(): RotaGridStaffRow {
  return {
    kind: "staff",
    staff,
    cells: Array.from({ length: 7 }, () => ({ shifts: [] })),
  };
}

function shift(dayIndex: DraftShift["dayIndex"]): DraftShift {
  return {
    id: `shift-${dayIndex}`,
    dayIndex,
    staffId: staff.id,
    role: staff.role,
    start: "09:00",
    end: "17:00",
    breakMinutes: 30,
    tone: "info",
    status: "scheduled",
  };
}

describe("availability constraints", () => {
  const dates = [
    "2026-07-13",
    "2026-07-14",
    "2026-07-15",
    "2026-07-16",
    "2026-07-17",
    "2026-07-18",
    "2026-07-19",
  ];

  it("adds muted one-off and quieter recurring hints to empty cells", () => {
    const [decorated] = applyAvailabilityHints(
      [row()],
      dates,
      constraints({
        recurringByStaff: new Map([[staff.id, new Set([0])]]),
        unavailableDatesByStaff: new Map([[staff.id, new Set(["2026-07-14"])]]),
      }),
    );

    expect(decorated?.cells[0]?.availabilityHint).toBe("day-off");
    expect(decorated?.cells[1]?.availabilityHint).toBe("unavailable");
    expect(decorated?.cells[2]?.availabilityHint).toBeUndefined();
  });

  it("surfaces both approved constraint kinds as warning clashes", () => {
    const clashes = findAvailabilityConstraintClashes(
      [shift(0), shift(1)],
      dates,
      constraints({
        recurringByStaff: new Map([[staff.id, new Set([0])]]),
        unavailableDatesByStaff: new Map([[staff.id, new Set(["2026-07-14"])]]),
      }),
      new Map([[staff.id, staff]]),
    );

    expect(clashes.map((clash) => clash.kind)).toEqual(["day-off", "unavailable"]);
  });

  it("lets a one-off constraint take precedence when both apply", () => {
    const clashes = findAvailabilityConstraintClashes(
      [shift(0)],
      dates,
      constraints({
        recurringByStaff: new Map([[staff.id, new Set([0])]]),
        unavailableDatesByStaff: new Map([[staff.id, new Set(["2026-07-13"])]]),
      }),
      new Map([[staff.id, staff]]),
    );

    expect(clashes).toHaveLength(1);
    expect(clashes[0]?.kind).toBe("unavailable");
  });

  it("surfaces a next-date constraint for an overnight shift", () => {
    const overnight = { ...shift(0), start: "22:00", end: "06:00" };
    const clashes = findAvailabilityConstraintClashes(
      [overnight],
      dates,
      constraints({
        unavailableDatesByStaff: new Map([[staff.id, new Set(["2026-07-14"])]]),
      }),
      new Map([[staff.id, staff]]),
    );

    expect(clashes).toHaveLength(1);
    expect(clashes[0]).toMatchObject({
      shiftId: overnight.id,
      isoDate: "2026-07-14",
      kind: "unavailable",
    });
  });
});
