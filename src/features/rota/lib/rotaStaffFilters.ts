import type {
  DraftShift,
  RotaFilters,
  RotaShiftStatusFilter,
  StaffId,
  StaffMember,
} from "../types";
import { isWorkingTimeAtRisk } from "./rotaWorkingTimeAlerts";

/**
 * Which staff rows the grid shows.
 *
 * Every predicate here narrows the roster and nothing else — filtering never
 * changes a shift, a count or a coverage figure. Keeping it apart from
 * `rotaSummaries` is what stops a filter from quietly becoming an input to a
 * number a manager reads as the truth about the whole week.
 */

function staffHasScheduled(shifts: DraftShift[], staffId: StaffId): boolean {
  return shifts.some(
    (s) => s.staffId === staffId && (s.status === "scheduled" || s.status === "conflict"),
  );
}

export function staffHasConflict(shifts: DraftShift[], staffId: StaffId): boolean {
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
