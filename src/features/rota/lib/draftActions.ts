import type { DraftShift, ShiftId } from "../types";
import { makeDraftShift } from "./draftRota";

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
