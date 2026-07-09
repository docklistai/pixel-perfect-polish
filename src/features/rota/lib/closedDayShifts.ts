import type { DraftShift } from "../types";
import { isoWeekday } from "./recurringDayOffClashes";
import { isOpenOnWeekday, WEEKDAY_FULL } from "@/features/settings/lib/openingDays";

/**
 * Shifts scheduled on a day the business is marked closed. Weekday is derived
 * from each day's real ISO date (week-start-agnostic). A null mask means opening
 * days are unconfigured, so nothing is flagged.
 */

export type ClosedDayShift = {
  shiftId: string;
  dayLabel: string;
  role: string;
};

export function findClosedDayShifts(
  shifts: DraftShift[],
  dayIsoDates: string[],
  openWeekdaysMask: number | null,
): ClosedDayShift[] {
  if (openWeekdaysMask === null) return [];
  const result: ClosedDayShift[] = [];
  for (const shift of shifts) {
    const iso = dayIsoDates[shift.dayIndex];
    if (iso === undefined) continue;
    const weekday = isoWeekday(iso);
    if (isOpenOnWeekday(openWeekdaysMask, weekday)) continue;
    result.push({
      shiftId: shift.id,
      dayLabel: WEEKDAY_FULL[weekday] ?? "that day",
      role: shift.role,
    });
  }
  return result;
}
