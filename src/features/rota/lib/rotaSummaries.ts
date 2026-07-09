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

export function countOpenShifts(shifts: DraftShift[]): number {
  return shifts.reduce((acc, s) => (s.staffId === null ? acc + 1 : acc), 0);
}

export function countAssignedShifts(shifts: DraftShift[]): number {
  return shifts.reduce((acc, s) => (s.staffId !== null ? acc + 1 : acc), 0);
}

export function countPlannedShifts(shifts: DraftShift[]): number {
  return shifts.length;
}

function staffHasScheduled(shifts: DraftShift[], staffId: StaffId): boolean {
  return shifts.some(
    (s) => s.staffId === staffId && (s.status === "scheduled" || s.status === "conflict"),
  );
}

function staffHasConflict(shifts: DraftShift[], staffId: StaffId): boolean {
  return shifts.some((s) => s.staffId === staffId && s.status === "conflict");
}

function staffMatchesDepartmentFilter(
  staff: StaffMember,
  shifts: DraftShift[],
  filter: string,
): boolean {
  if (filter === "all") return true;
  if (staff.role === filter) return true;
  return shifts.some(
    (shift) =>
      shift.staffId === staff.id && (shift.deptOverride === filter || shift.role === filter),
  );
}

function staffScheduledDayCount(staff: StaffMember, shifts: DraftShift[]): number {
  const days = new Set<number>();
  for (const s of shifts) {
    if (s.staffId === staff.id) days.add(s.dayIndex);
  }
  return days.size;
}

function isWorkingTimeAtRisk(staff: StaffMember, shifts: DraftShift[]): boolean {
  return staff.hrs === "40h" && staffScheduledDayCount(staff, shifts) > 5;
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

function matchesShiftStatusFilter(
  filter: RotaShiftStatusFilter,
  shifts: DraftShift[],
  staffId: StaffId,
): boolean {
  switch (filter) {
    case "all":
      return true;
    case "scheduled":
      return staffHasScheduled(shifts, staffId);
    case "conflict":
      return staffHasConflict(shifts, staffId);
    case "open":
      // Open shifts live in their own row, never tied to a staff member.
      return false;
  }
}

export function filterStaff(
  staff: StaffMember[],
  draftShifts: DraftShift[],
  filters: RotaFilters,
  search: string,
): StaffMember[] {
  const normalized = search.trim().toLowerCase();
  return staff.filter((member) => {
    const matchesSearch =
      !normalized ||
      member.name.toLowerCase().includes(normalized) ||
      member.role.toLowerCase().includes(normalized);
    const matchesDepartment = staffMatchesDepartmentFilter(member, draftShifts, filters.department);
    const matchesShiftStatus = matchesShiftStatusFilter(
      filters.shiftStatus,
      draftShifts,
      member.id,
    );
    const matchesWarning =
      filters.warningType === "all" ||
      (filters.warningType === "conflicts" && staffHasConflict(draftShifts, member.id)) ||
      (filters.warningType === "working-time" && isWorkingTimeAtRisk(member, draftShifts));
    return matchesSearch && matchesDepartment && matchesShiftStatus && matchesWarning;
  });
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

export function staffWeeklyHourTarget(staff: StaffMember[]): number {
  return staff.reduce((sum, m) => {
    const parsed = parseInt(m.hrs, 10);
    return sum + (Number.isNaN(parsed) ? 0 : parsed);
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
