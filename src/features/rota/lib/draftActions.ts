import type { DraftShift, RotaDayIndex, ShiftId } from "../types";
import { makeDraftShift } from "./draftRota";
import { DAY_COUNT } from "./draftShiftCore";

/** Copies a shift to the following day (clamped to the week end), keeping assignee and times. */
export function copyShiftToNextDay(source: DraftShift): DraftShift {
  const nextDay = Math.min(source.dayIndex + 1, DAY_COUNT - 1) as RotaDayIndex;
  return {
    ...makeDraftShift({
      dayIndex: nextDay,
      staffId: source.staffId,
      role: source.role,
      start: source.start,
      end: source.end,
      status: source.status === "open" ? "open" : "scheduled",
      tone: source.tone,
    }),
    deptOverride: source.deptOverride,
    colourOverride: source.colourOverride,
    edited: true,
  };
}

export function duplicateDraftShiftAsOpen(shifts: DraftShift[], id: ShiftId): DraftShift[] {
  const source = shifts.find((shift) => shift.id === id);
  if (!source) return shifts;
  return [
    ...shifts,
    makeDraftShift({
      dayIndex: source.dayIndex,
      staffId: null,
      role: source.role,
      start: source.start,
      end: source.end,
      status: "open",
      tone: "open",
    }),
  ];
}
