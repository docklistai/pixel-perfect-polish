import type { DraftShift, DraftShiftInput } from "../types";

/**
 * Everything needed to recreate a shift that was removed.
 *
 * This is deliberately exhaustive. A recreate that dropped the shift's own
 * department would silently re-resolve it from the assignee — moving a genuine
 * cross-department cover shift into the wrong department — and dropping the
 * manager's colour or legacy label overrides would quietly lose their edits.
 *
 * Recreation always produces a new shift id. It restores the shift's content,
 * never its identity, and must never be described as an undo.
 */
export function shiftToInput(shift: DraftShift): DraftShiftInput {
  return {
    dayIndex: shift.dayIndex,
    staffId: shift.staffId,
    role: shift.role,
    start: shift.start,
    end: shift.end,
    breakMinutes: shift.breakMinutes,
    status: shift.status,
    tone: shift.tone,
    ...(shift.departmentId ? { departmentId: shift.departmentId } : {}),
    ...(shift.deptOverride ? { deptOverride: shift.deptOverride } : {}),
    ...(shift.colourOverride ? { colourOverride: shift.colourOverride } : {}),
  };
}
