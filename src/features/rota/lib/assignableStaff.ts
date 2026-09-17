import type { StaffRow } from "@/features/staff/types";
import type { DraftShift, StaffId, StaffMember } from "../types";
import { normaliseRoleKey } from "./scheduling/shiftSignature";

export const COPY_ASSIGNMENT_BLOCKED_REASON =
  "Reassign or open this shift before duplicating/repeating.";

const COPY_SOURCE_MISSING_REASON = "The source shift is no longer available.";

/**
 * Checks if a staff member is eligible to work a target role.
 * A staff member is eligible if:
 * 1. Their primary role matches (normalized equality)
 * 2. OR any of their additive secondary eligible roles match (normalized equality)
 */
export function isStaffEligibleForRole(
  staff: { role: string; eligibleRoles?: string[] },
  targetRole: string | null | undefined,
): boolean {
  if (!targetRole || !targetRole.trim()) return true;
  const targetKey = normaliseRoleKey(targetRole);
  if (!targetKey) return true;

  if (normaliseRoleKey(staff.role) === targetKey) return true;
  return (staff.eligibleRoles ?? []).some((r) => normaliseRoleKey(r) === targetKey);
}

/**
 * Filters a list of staff members to those eligible for a target role.
 */
export function filterStaffByRoleEligibility<T extends { role: string; eligibleRoles?: string[] }>(
  staffList: readonly T[],
  targetRole: string | null | undefined,
): T[] {
  if (!targetRole || !targetRole.trim()) return [...staffList];
  return staffList.filter((s) => isStaffEligibleForRole(s, targetRole));
}

/**
 * Returns active staff rows, optionally filtered by eligibility for a required role.
 */
export function getAssignableStaffRows(rows: StaffRow[], requiredRole?: string | null): StaffRow[] {
  const activeRows = rows.filter(
    (row) =>
      row.employmentStatus === "active" || (!row.employmentStatus && row.status === "Active"),
  );
  if (!requiredRole || !requiredRole.trim()) return activeRows;
  return activeRows.filter((row) => isStaffEligibleForRole(row, requiredRole));
}

export function isShiftCopyAssignable(
  shift: { staffId: StaffId | null; role?: string },
  assignableStaff: readonly StaffMember[],
): boolean {
  if (shift.staffId === null) return true;
  const member = assignableStaff.find((staffMember) => staffMember.id === shift.staffId);
  if (!member) return false;
  return isStaffEligibleForRole(member, shift.role);
}

export function getShiftCopyBlockedReason(
  shift: (Pick<DraftShift, "staffId"> & { role?: string }) | undefined,
  assignableStaff: StaffMember[],
): string | null {
  if (!shift) return COPY_SOURCE_MISSING_REASON;
  return isShiftCopyAssignable(shift, assignableStaff) ? null : COPY_ASSIGNMENT_BLOCKED_REASON;
}
