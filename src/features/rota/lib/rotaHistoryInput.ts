import type { DraftShift, DraftShiftInput } from "../types";

export function shiftToInput(shift: DraftShift): DraftShiftInput {
  return {
    dayIndex: shift.dayIndex,
    staffId: shift.staffId,
    role: shift.role,
    start: shift.start,
    end: shift.end,
    breakMinutes: shift.breakMinutes,
    status: shift.status,
  };
}
