import type {
  DraftShift,
  RoleCoverageSummary,
  RotaFilters,
  RotaShiftStatusFilter,
  StaffId,
  StaffMember,
  WorkingTimeAlert,
} from "../types";
import { DAY_COUNT, formatShiftTime, shiftHours } from "./draftRota";

/**
 * Week-level numbers the rota header and cards read.
 *
 * Which staff are *shown* is `rotaStaffFilters`, and the sixth-day heads-up is
 * `rotaWorkingTimeAlerts`. Both are re-exported here so every existing call site
 * keeps importing from one place.
 */

export { filterStaff, staffHasConflict } from "./rotaStaffFilters";
export {
  isWorkingTimeAtRisk,
  staffScheduledDayCount,
  workingTimeAlerts,
} from "./rotaWorkingTimeAlerts";

export function countOpenShifts(shifts: DraftShift[]): number {
  return shifts.reduce((acc, s) => (s.staffId === null ? acc + 1 : acc), 0);
}

export function countAssignedShifts(shifts: DraftShift[]): number {
  return shifts.reduce((acc, s) => (s.staffId !== null ? acc + 1 : acc), 0);
}

export function countPlannedShifts(shifts: DraftShift[]): number {
  return shifts.length;
}

export function buildRoleCoverage(
  staff: StaffMember[],
  shifts: DraftShift[],
): RoleCoverageSummary[] {
  const roles = new Map<string, { days: Set<number>; tone: string }>();
  for (const member of staff) {
    roles.set(
      member.role,
      roles.get(member.role) ?? { days: new Set<number>(), tone: member.tone },
    );
  }

  for (const shift of shifts) {
    if (shift.staffId === null) continue;
    const current = roles.get(shift.role) ?? { days: new Set<number>(), tone: shift.tone };
    current.days.add(shift.dayIndex);
    roles.set(shift.role, current);
  }

  return Array.from(roles.entries())
    .map(([role, { days, tone }]) => {
      const filled = days.size;
      const pct = Math.round((filled / DAY_COUNT) * 100);
      return { label: role, value: `${filled} / ${DAY_COUNT} days`, pct, tone };
    })
    .sort((a, b) => a.pct - b.pct);
}

/**
 * Total contracted hours across the roster, from the numeric field rather than by
 * parsing the `hrs` display string. Staff without a recorded contract contribute
 * nothing, which is honest: their target is unknown, not zero.
 */
export function staffWeeklyHourTarget(staff: StaffMember[]): number {
  return staff.reduce((sum, member) => {
    const contracted = member.contractedMinutesPerWeek;
    return sum + (contracted == null ? 0 : contracted / 60);
  }, 0);
}

export function totalScheduledHours(shifts: DraftShift[]): number {
  return shifts.reduce(
    (sum, s) => (s.staffId !== null ? sum + shiftHours(s.start, s.end) : sum),
    0,
  );
}

export function coveragePercent(staff: StaffMember[], shifts: DraftShift[]): number {
  const planned = countPlannedShifts(shifts);
  if (!planned) return 0;
  return Math.max(0, Math.round((countAssignedShifts(shifts) / planned) * 100));
}

export type RotaDayStat = {
  h: string;
  c: string;
  tone: "muted" | "warning" | "danger";
  /** Assigned scheduled hours for the day, for daily-budget comparison. */
  hours: number;
};

export function buildDayStats(shifts: DraftShift[]): RotaDayStat[] {
  return Array.from({ length: DAY_COUNT }, (_, dayIndex) => {
    const dayShifts = shifts.filter((shift) => shift.dayIndex === dayIndex);
    const assigned = dayShifts.filter((shift) => shift.staffId !== null);
    const open = dayShifts.length - assigned.length;
    const hours = assigned.reduce((sum, shift) => sum + shiftHours(shift.start, shift.end), 0);
    const coverage = dayShifts.length
      ? Math.round((assigned.length / dayShifts.length) * 100)
      : 100;
    const tone =
      open > 0
        ? "warning"
        : dayShifts.some((shift) => shift.status === "conflict")
          ? "danger"
          : "muted";

    return {
      h: `${Math.round(hours)}h`,
      c: `${coverage}%`,
      tone,
      hours,
    };
  });
}
