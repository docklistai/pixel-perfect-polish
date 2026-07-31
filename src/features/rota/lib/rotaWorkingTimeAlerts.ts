import type { DraftShift, StaffMember, WorkingTimeAlert } from "../types";

/**
 * The sixth-day heads-up.
 *
 * This is a scheduling prompt, not a working-time compliance check, and is never
 * presented as one. Keeping it in its own file is part of that: it is not a
 * summary statistic, and it must not drift into being treated as a limit.
 */

/**
 * Contracted minutes at or above which a sixth working day is worth flagging.
 * 35h/week — the conventional full-time floor, so 37.5h and 40h contracts are
 * both covered where a literal `"40h"` string match saw only one of them.
 */
const FULL_TIME_MINUTES_PER_WEEK = 35 * 60;

export function staffScheduledDayCount(staff: StaffMember, shifts: DraftShift[]): number {
  const days = new Set<number>();
  for (const s of shifts) {
    if (s.staffId === staff.id) days.add(s.dayIndex);
  }
  return days.size;
}

/**
 * True when someone on a full-time contract is scheduled across more than five
 * days. It reads `contractedMinutesPerWeek`, the real numeric field, rather than
 * the `hrs` display string it used to compare literally.
 *
 * Staff with no recorded contract are not flagged: the absence of a figure is
 * not evidence of anything.
 */
export function isWorkingTimeAtRisk(staff: StaffMember, shifts: DraftShift[]): boolean {
  const contracted = staff.contractedMinutesPerWeek;
  if (contracted == null || contracted < FULL_TIME_MINUTES_PER_WEEK) return false;
  return staffScheduledDayCount(staff, shifts) > 5;
}

export function workingTimeAlerts(staff: StaffMember[], shifts: DraftShift[]): WorkingTimeAlert[] {
  return staff
    .filter((member) => isWorkingTimeAtRisk(member, shifts))
    .map((member) => ({
      staffId: member.id,
      staffName: member.name,
      scheduledDays: staffScheduledDayCount(member, shifts),
    }));
}
