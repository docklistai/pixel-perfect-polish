import { describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import { useRotaWeekDerivedData } from "./useRotaWeekDerivedData";
import type { BoundaryOverlap } from "../api/boundaryOverlaps";
import type { DraftShift, StaffMember } from "../types";

/**
 * The acknowledgement count is a MIRROR of `rpc_publish_rota_week`'s
 * `overlapping_shift` clash kind, so what it counts matters more than how it is
 * assembled: unique shifts belonging to the week being published, whether the
 * partner sits inside this week or outside it.
 */

// 2026-06-08 is a Monday.
const WEEK_START = "2026-06-08";

const ROSTER: StaffMember[] = [
  { id: "staff-1", name: "Ana Petrova", role: "Bartender", hrs: "40h" } as StaffMember,
  { id: "staff-2", name: "Tom Reed", role: "Waiter", hrs: "20h" } as StaffMember,
];

function shift(partial: Partial<DraftShift> & { id: string }): DraftShift {
  return {
    dayIndex: 0,
    staffId: "staff-1",
    role: "Bartender",
    start: "09:00",
    end: "17:00",
    breakMinutes: 30,
    tone: "info",
    status: "scheduled",
    ...partial,
  };
}

function overlap(partial: Partial<BoundaryOverlap> = {}): BoundaryOverlap {
  return {
    shiftId: "mon-early",
    otherShiftId: "external-1",
    staffMemberId: "staff-1",
    otherRotaWeekId: "week-previous",
    otherLocationId: "loc-current",
    otherDepartmentId: "dept-1",
    otherShiftDate: "2026-06-07",
    otherStart: "22:00",
    otherEnd: "06:00",
    otherLocationName: "Harbour",
    sameLocation: true,
    side: "before",
    ...partial,
  };
}

function derive(sourceShifts: DraftShift[], boundaryOverlaps: BoundaryOverlap[] = []) {
  return renderHook(() =>
    useRotaWeekDerivedData({
      isLive: true,
      weekStart: WEEK_START,
      today: WEEK_START,
      weekOffset: 0,
      sourceShifts,
      leaveRequests: [],
      roster: ROSTER,
      boundaryOverlaps,
    }),
  ).result.current;
}

describe("useRotaWeekDerivedData boundary integration", () => {
  it("counts a shift overlapping only an external partner", () => {
    const derived = derive([shift({ id: "mon-early", start: "05:00", end: "13:00" })], [overlap()]);

    expect(derived.overlappingShiftCount).toBe(1);
    expect(derived.conflictSummaries).toHaveLength(1);
    expect(derived.displayShifts[0]!.status).toBe("conflict");
  });

  it("counts a shift once when it overlaps both an in-week and an external partner", () => {
    const derived = derive(
      [
        shift({ id: "mon-early", start: "09:00", end: "17:00" }),
        shift({ id: "mon-late", start: "10:00", end: "18:00" }),
      ],
      [overlap()],
    );

    // mon-early and mon-late overlap each other (2 affected shifts); mon-early
    // additionally overlaps an external shift. The union is still 2, not 3 —
    // matching the RPC's `select distinct` on the published-week side.
    expect(derived.overlappingShiftCount).toBe(2);
  });

  it("counts a shift once when it overlaps several external partners", () => {
    const derived = derive(
      [shift({ id: "mon-early", start: "05:00", end: "13:00" })],
      [overlap(), overlap({ otherShiftId: "external-2", otherShiftDate: "2026-06-08" })],
    );

    expect(derived.overlappingShiftCount).toBe(1);
  });

  it("never lets external context enter the visible week's rows or totals", () => {
    const shifts = [
      shift({ id: "mon-early", start: "05:00", end: "13:00" }),
      shift({ id: "open-1", staffId: null, status: "open", tone: "open" }),
    ];
    const without = derive(shifts);
    const with_ = derive(shifts, [overlap()]);

    expect(with_.displayShifts).toHaveLength(without.displayShifts.length);
    expect(with_.displayShifts.map((row) => row.id)).toEqual(["mon-early", "open-1"]);
    expect(with_.days).toEqual(without.days);
    expect(with_.days.map((day) => day.hours)).toEqual(without.days.map((day) => day.hours));
    expect(with_.dayIsoDates).toEqual(without.dayIsoDates);
    // The open row is untouched by boundary marking.
    expect(with_.displayShifts[1]!.status).toBe("open");
  });

  it("leaves in-week detection exactly as it was when there is no external context", () => {
    const derived = derive([
      shift({ id: "mon-early", start: "09:00", end: "17:00" }),
      shift({ id: "mon-late", start: "10:00", end: "18:00" }),
    ]);

    expect(derived.overlappingShiftCount).toBe(2);
    expect(derived.conflictSummaries).toHaveLength(1);
  });

  it("does not flag a different staff member's shift", () => {
    const derived = derive(
      [
        shift({ id: "mon-early", start: "05:00", end: "13:00" }),
        shift({ id: "mon-other", staffId: "staff-2", start: "05:00", end: "13:00" }),
      ],
      [overlap()],
    );

    expect(derived.overlappingShiftCount).toBe(1);
    expect(derived.displayShifts[1]!.status).toBe("scheduled");
  });
});
