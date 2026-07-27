import type { DraftShift, StaffMember } from "../types";
import { getShiftCopyBlockedReason } from "./assignableStaff";
import { DAY_COUNT } from "./draftShiftCore";

/**
 * Rules for "Duplicate to next day", shared by the draft store and the live
 * rota so both paths refuse the same shifts for the same stated reason.
 *
 * A shift on the final day of its rota week has no next day inside that week.
 * Both paths previously clamped the target back onto that day, which silently
 * produced a same-day copy and reported it as a successful duplication to the
 * next day. Cross-week duplication is out of scope for the pilot, so the action
 * is refused with copy that says where the shift has to be added instead.
 *
 * The copy names no weekday. `workspaces.rota_start_weekday` (phase 24) lets a
 * venue start its week on any day, so the final day is Sunday only for the
 * Monday-start default; naming it would be wrong for every other workspace. The
 * rule itself is start-day agnostic — the client keys off the last day index
 * and the server off `week_start + 6`.
 */

/** The final day of a rota week, whichever weekday the workspace starts on. */
export const LAST_ROTA_DAY_INDEX = DAY_COUNT - 1;

export const LAST_DAY_DUPLICATE_BLOCKED_REASON =
  "This is the last day of this rota week. Open next week and add the shift there.";

export function isLastRotaWeekDay(dayIndex: number): boolean {
  return dayIndex >= LAST_ROTA_DAY_INDEX;
}

/**
 * The single reason a duplicate is refused, or null when it may proceed.
 * Assignment problems are reported first because they describe the shift
 * itself; the last-day rule is about where the copy would land.
 */
export function getShiftDuplicateBlockedReason(
  shift: Pick<DraftShift, "staffId" | "dayIndex"> | undefined,
  assignableStaff: StaffMember[],
): string | null {
  const assignmentReason = getShiftCopyBlockedReason(shift, assignableStaff);
  if (assignmentReason) return assignmentReason;
  return isLastRotaWeekDay(shift!.dayIndex) ? LAST_DAY_DUPLICATE_BLOCKED_REASON : null;
}
