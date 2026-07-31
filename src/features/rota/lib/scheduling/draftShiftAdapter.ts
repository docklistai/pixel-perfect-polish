import type { DraftShift } from "../../types";
import { dayNumberFromIso, isoDateFromDayNumber, type LocalShiftTimes } from "./calendarInterval";
import type { CommittedShift } from "./eligibility";

/**
 * Bridges the grid's `DraftShift` (a day *index* plus wall-clock strings) to the
 * scheduling engine's `LocalShiftTimes` (a real date plus wall-clock strings).
 *
 * Real ISO dates are required for anything that looks a constraint up by date —
 * leave, recurring days off, one-off unavailability. They are *not* required for
 * interval arithmetic, which only ever needs the relative distance between two
 * days. So when a caller has no real dates to hand, a synthetic Monday-anchored
 * week is substituted.
 *
 * That substitution is what lets the conflict engine become calendar-correct
 * without threading `dayIsoDates` through every call site: a Monday 22:00–02:00
 * shift and a Tuesday 00:00–08:00 shift are two hours apart on the synthetic week
 * exactly as they are on a real one. Constraint lookups keep passing their real
 * dates, because for those the actual calendar genuinely matters.
 */

/** A Monday, so `dayIndex` 0 lands on a Monday like a default rota week. */
const SYNTHETIC_WEEK_START = "2000-01-03";
const SYNTHETIC_WEEK_START_DAY = dayNumberFromIso(SYNTHETIC_WEEK_START)!;

/**
 * The local work date for a day index — the caller's real date when it has one,
 * otherwise the synthetic week's equivalent day.
 */
export function workDateForDayIndex(dayIndex: number, dayIsoDates?: readonly string[]): string {
  const real = dayIsoDates?.[dayIndex];
  if (real !== undefined) return real;
  return isoDateFromDayNumber(SYNTHETIC_WEEK_START_DAY + dayIndex);
}

/** True when this date came from the synthetic week rather than the real calendar. */
export function isSyntheticWorkDate(dayIndex: number, dayIsoDates?: readonly string[]): boolean {
  return dayIsoDates?.[dayIndex] === undefined;
}

export function draftShiftTimes(
  shift: Pick<DraftShift, "dayIndex" | "start" | "end">,
  dayIsoDates?: readonly string[],
): LocalShiftTimes {
  return {
    workDate: workDateForDayIndex(shift.dayIndex, dayIsoDates),
    start: shift.start,
    end: shift.end,
  };
}

/**
 * Every assigned shift as a committed interval. Open shifts are skipped because
 * nobody is committed to them yet.
 */
export function committedShiftsFrom(
  shifts: readonly DraftShift[],
  dayIsoDates?: readonly string[],
): CommittedShift[] {
  const committed: CommittedShift[] = [];
  for (const shift of shifts) {
    if (shift.staffId === null) continue;
    committed.push({
      shiftId: shift.id,
      staffId: shift.staffId,
      times: draftShiftTimes(shift, dayIsoDates),
    });
  }
  return committed;
}
