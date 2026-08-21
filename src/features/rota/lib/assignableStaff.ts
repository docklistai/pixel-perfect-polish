import type { StaffRow } from "@/features/staff/types";
import type { DraftShift, StaffMember } from "../types";

export const COPY_ASSIGNMENT_BLOCKED_REASON =
  "Reassign or open this shift before duplicating/repeating.";

const COPY_SOURCE_MISSING_REASON = "The source shift is no longer available.";

export function getAssignableStaffRows(rows: StaffRow[]): StaffRow[] {
  return rows.filter(
    (row) =>
      row.employmentStatus === "active" || (!row.employmentStatus && row.status === "Active"),
  );
}

export function isShiftCopyAssignable(
  shift: Pick<DraftShift, "staffId">,
  assignableStaff: readonly StaffMember[],
): boolean {
  return (
    shift.staffId === null ||
    assignableStaff.some((staffMember) => staffMember.id === shift.staffId)
  );
}

export function getShiftCopyBlockedReason(
  shift: Pick<DraftShift, "staffId"> | undefined,
  assignableStaff: StaffMember[],
): string | null {
  if (!shift) return COPY_SOURCE_MISSING_REASON;
  return isShiftCopyAssignable(shift, assignableStaff) ? null : COPY_ASSIGNMENT_BLOCKED_REASON;
}
