import type { DraftShift } from "../types";

/**
 * Pure inverse logic for rota undo/redo. Every shift edit is an `updateShift`
 * (times, role, staff, mark-open, colour/role override, reset), so undoing one
 * is another update that restores the fields it touched. This module captures
 * that inverse patch; the history hook wires it to the controller.
 *
 * These are the fields a rota update may change and must be able to reverse.
 */
export const REVERSIBLE_FIELDS = [
  "staffId",
  // Moving a shift between days. Its absence here was not cosmetic: a day-only
  // move would have produced an EMPTY inverse patch, and replaying that empty
  // patch fails `updateShiftInput`'s "at least one shift field is required"
  // refine — so Undo would have reported an error instead of moving the shift
  // back. Any new field the grid can patch belongs in this list.
  "dayIndex",
  "role",
  "start",
  "end",
  "breakMinutes",
  "status",
  "tone",
  "colourOverride",
  "deptOverride",
  "edited",
] as const;

/**
 * The patch that reverses `patch` on `shift`: for each reversible key the patch
 * touches, restore the shift's current value. Keys absent from the shift map to
 * `undefined` (which clears an override — the correct inverse of setting one).
 */
export function captureInversePatch(
  shift: DraftShift,
  patch: Partial<DraftShift>,
): Partial<DraftShift> {
  const inverse: Partial<DraftShift> = {};
  for (const key of Object.keys(patch) as (keyof DraftShift)[]) {
    if ((REVERSIBLE_FIELDS as readonly string[]).includes(key)) {
      // Restore the pre-edit value (undefined clears a field that was unset).
      (inverse as Record<string, unknown>)[key] = shift[key];
    }
  }
  return inverse;
}

/** True when a patch actually changes at least one field of the shift. */
export function patchChangesShift(shift: DraftShift, patch: Partial<DraftShift>): boolean {
  for (const key of Object.keys(patch) as (keyof DraftShift)[]) {
    if (patch[key] !== shift[key]) return true;
  }
  return false;
}
