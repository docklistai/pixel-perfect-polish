import type { DraftShift, StaffMember } from "../types";

/**
 * Flags rota shifts assigned to a staff member on a weekday they have an
 * *approved* recurring day off. Pure and week-start-agnostic: the weekday is
 * derived from each day's real ISO date, not the column index, so it stays
 * correct whatever day the rota week starts on.
 */

const WEEKDAY_LABELS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export type RecurringDayOffClash = {
  shiftId: string;
  staffId: string;
  staffName: string;
  dayLabel: string;
  isoDate: string;
};

/** 0 = Monday .. 6 = Sunday from an ISO date (noon-UTC parse avoids TZ drift). */
export function isoWeekday(isoDate: string): number {
  const utcDay = new Date(`${isoDate}T12:00:00Z`).getUTCDay(); // 0 = Sun .. 6 = Sat
  return (utcDay + 6) % 7; // 0 = Mon .. 6 = Sun
}

export function findRecurringDayOffClashes(
  shifts: DraftShift[],
  dayIsoDates: string[],
  /** staff id → set of approved day-off weekdays (0 = Mon .. 6 = Sun). */
  approvedByStaff: Map<string, Set<number>>,
  staffById: Map<string, StaffMember>,
): RecurringDayOffClash[] {
  const clashes: RecurringDayOffClash[] = [];
  for (const shift of shifts) {
    if (shift.staffId === null) continue;
    const approved = approvedByStaff.get(shift.staffId);
    if (approved === undefined) continue;
    const isoDate = dayIsoDates[shift.dayIndex];
    if (isoDate === undefined) continue;
    const weekday = isoWeekday(isoDate);
    if (!approved.has(weekday)) continue;
    clashes.push({
      shiftId: shift.id,
      staffId: shift.staffId,
      staffName: staffById.get(shift.staffId)?.name ?? "This staff member",
      dayLabel: WEEKDAY_LABELS[weekday] ?? "that day",
      isoDate,
    });
  }
  return clashes;
}
