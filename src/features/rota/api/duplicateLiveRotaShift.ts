import { LAST_DAY_DUPLICATE_BLOCKED_REASON } from "../lib/duplicateShiftRules";
import { addIsoDays } from "../lib/liveRotaDates";
import type { ExistingShiftRow } from "./rotaLiveShiftMapping";

/**
 * The day a duplicate lands on, inside the shift's own rota week.
 *
 * A shift on the week's final day has no next day in that week. This previously
 * clamped the target back to the week end, which wrote a second shift on the
 * same day and reported it as duplicated to the next day. `week_start + 6` is
 * the boundary whichever weekday the workspace starts its week on. Cross-week
 * duplication is out of scope for the pilot, so the write is refused with the
 * same reason the menu shows.
 */
export function resolveDuplicateTargetDate(shiftDate: string, weekStart: string): string {
  const nextDate = addIsoDays(shiftDate, 1);
  if (nextDate > addIsoDays(weekStart, 6)) throw new Error(LAST_DAY_DUPLICATE_BLOCKED_REASON);
  return nextDate;
}

export async function executeLiveRotaShiftDuplicate({
  shift,
  validateAssignment,
  insertCopy,
}: {
  shift: ExistingShiftRow;
  validateAssignment: (staffId: string) => Promise<unknown>;
  insertCopy: (shift: ExistingShiftRow) => Promise<string>;
}): Promise<string> {
  if (shift.staff_member_id) {
    await validateAssignment(shift.staff_member_id);
  }
  return insertCopy(shift);
}
