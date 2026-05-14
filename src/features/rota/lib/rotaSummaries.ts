import type {
  ConflictSummary,
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

export function countConflicts(shifts: DraftShift[]): number {
  return shifts.reduce((acc, s) => (s.status === "conflict" ? acc + 1 : acc), 0);
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
    const matchesDepartment = filters.department === "all" || member.role === filters.department;
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

export function buildConflictSummaries(
  shifts: DraftShift[],
  staff: StaffMember[],
  dayLabels: string[],
): ConflictSummary[] {
  return shifts
    .filter((s) => s.status === "conflict")
    .map((s) => {
      const staffName =
        s.staffId === null
          ? "Open shift"
          : (staff.find((m) => m.id === s.staffId)?.name ?? "Unknown");
      return {
        id: s.id,
        staff: staffName,
        day: dayLabels[s.dayIndex] ?? "",
        detail: `${s.role} · ${formatShiftTime(s.start, s.end)}`,
        guidance:
          "Needs manager review. Check overlap, leave, or role cover before publishing. Edit the shift, mark it open, or reassign it if cover is uncertain.",
      };
    });
}

export function buildRoleCoverage(
  staff: StaffMember[],
  shifts: DraftShift[],
): RoleCoverageSummary[] {
  return staff
    .map((member) => {
      const days = new Set<number>();
      for (const s of shifts) {
        if (s.staffId === member.id && s.status !== "open") {
          days.add(s.dayIndex);
        }
      }
      const filled = days.size;
      const pct = Math.round((filled / DAY_COUNT) * 100);
      return { label: member.role, value: `${filled} / ${DAY_COUNT}`, pct, tone: member.tone };
    })
    .sort((a, b) => a.pct - b.pct);
}

function staffWeeklyHourTarget(staff: StaffMember[]): number {
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
  const target = staffWeeklyHourTarget(staff);
  if (!target) return 0;
  return Math.max(0, Math.round((totalScheduledHours(shifts) / target) * 100));
}
