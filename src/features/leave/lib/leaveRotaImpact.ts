import { addIsoDays, liveWeekDayLabels } from "@/features/rota/lib/liveRotaDates";
import type { DraftShift } from "@/features/rota/types";

/**
 * Read-only "Rota impact" support for the live leave review. Given the rota
 * week the leave starts in and the requesting staff member, it lists the
 * *scheduled* shifts assigned to that person that fall inside the leave window —
 * the shifts a manager would have to cover if they approve. It invents nothing:
 * no coverage percentages, no risk level, no recommendation. Open shifts (no
 * assignee) are never counted as "exposed", because approving leave does not
 * remove an already-unassigned shift.
 */

export interface LeaveRotaImpactShift {
  id: string;
  /** ISO date (YYYY-MM-DD) the shift falls on. */
  dateIso: string;
  /** Human label, e.g. "Wed 8 Jul". */
  dayLabel: string;
  role: string;
  /** 24-hour HH:MM. */
  start: string;
  /** 24-hour HH:MM. */
  end: string;
}

export interface LeaveRotaImpact {
  weekStartIso: string;
  /** Scheduled, assigned shifts inside the leave window (this week only), date-sorted. */
  affectedShifts: LeaveRotaImpactShift[];
  /** True when the leave start date actually falls inside the fetched week. */
  leaveStartsInWeek: boolean;
  /** True when the leave window extends past the end of the fetched week. */
  spansBeyondWeek: boolean;
}

interface BuildArgs {
  shifts: DraftShift[];
  weekStartIso: string;
  staffId: string;
  /** Inclusive ISO start of the leave window. */
  startIso: string;
  /** Inclusive ISO end of the leave window. */
  endIso: string;
}

/**
 * Pure: derive the rota impact of one leave request against one fetched rota
 * week. ISO date strings compare lexicographically, so range checks are plain
 * string comparisons.
 */
export function buildLeaveRotaImpact({
  shifts,
  weekStartIso,
  staffId,
  startIso,
  endIso,
}: BuildArgs): LeaveRotaImpact {
  const dayLabels = liveWeekDayLabels(weekStartIso);
  const weekEndIso = addIsoDays(weekStartIso, 6);

  const affectedShifts = shifts
    .filter((shift) => shift.staffId === staffId && shift.status !== "open")
    .map((shift) => ({ shift, dateIso: addIsoDays(weekStartIso, shift.dayIndex) }))
    .filter(({ dateIso }) => dateIso >= startIso && dateIso <= endIso)
    .sort((a, b) => a.dateIso.localeCompare(b.dateIso))
    .map(({ shift, dateIso }) => ({
      id: shift.id,
      dateIso,
      dayLabel: dayLabels[shift.dayIndex] ?? dateIso,
      role: shift.role,
      start: shift.start,
      end: shift.end,
    }));

  return {
    weekStartIso,
    affectedShifts,
    leaveStartsInWeek: startIso >= weekStartIso && startIso <= weekEndIso,
    spansBeyondWeek: endIso > weekEndIso,
  };
}

function weekStartOfIso(isoDate: string): string {
  // Mirror weekStartForOffset's Monday-based week, using UTC noon to dodge DST.
  const weekday = new Date(`${isoDate}T12:00:00Z`).getUTCDay();
  const daysSinceMonday = weekday === 0 ? 6 : weekday - 1;
  return addIsoDays(isoDate, -daysSinceMonday);
}

/**
 * Whole-week offset from `todayIso`'s week to `targetIso`'s week, Monday-based.
 * Feeds `fetchWorkspaceRotaWeekFn({ weekOffset })`. The fetched week's own
 * `weekStart` is verified separately by `buildLeaveRotaImpact.leaveStartsInWeek`,
 * so a timezone boundary mismatch surfaces as honest "unavailable" copy rather
 * than wrong shifts.
 */
export function weekOffsetForDate(todayIso: string, targetIso: string): number {
  const fromMs = new Date(`${weekStartOfIso(todayIso)}T12:00:00Z`).getTime();
  const toMs = new Date(`${weekStartOfIso(targetIso)}T12:00:00Z`).getTime();
  return Math.round((toMs - fromMs) / (7 * 86_400_000));
}
