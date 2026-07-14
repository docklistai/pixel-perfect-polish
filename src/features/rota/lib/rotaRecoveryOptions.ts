import type { LeaveRequest } from "@/features/leave/types";
import type { DraftShift, StaffMember } from "../types";
import type { ApprovedAvailabilityConstraints } from "./availabilityConstraints";
import { isStaffConstrainedOnDates } from "./availabilityConstraints";
import { addIsoDays } from "./liveRotaDates";

export type RotaRecoveryOption = {
  staffId: string;
  staffName: string;
  note: string;
};

export const NO_SAFE_RECOVERY_OPTIONS =
  "No safe suggestions found; manager can still edit manually.";

export function buildRotaRecoveryOptions({
  shift,
  staff,
  shifts,
  leaveRequests,
  dayIsoDates,
  excludeStaffId,
  availabilityConstraints,
}: {
  shift: DraftShift;
  staff: StaffMember[];
  shifts: DraftShift[];
  leaveRequests: LeaveRequest[];
  dayIsoDates: string[];
  excludeStaffId?: string | null;
  availabilityConstraints?: ApprovedAvailabilityConstraints;
}): RotaRecoveryOption[] {
  const shiftDate = dayIsoDates[shift.dayIndex];
  if (!shiftDate) return [];
  const endTouchesNextDate = (parseMinutes(shift.end) ?? 0) <= (parseMinutes(shift.start) ?? 0);
  const constraintDates = endTouchesNextDate ? [shiftDate, addIsoDays(shiftDate, 1)] : [shiftDate];

  const options = staff
    .filter((member) => member.role === shift.role)
    .filter((member) => member.id !== excludeStaffId)
    .filter((member) => !isOnApprovedLeave(member.id, constraintDates, leaveRequests))
    .filter(
      (member) =>
        !availabilityConstraints ||
        !isStaffConstrainedOnDates(member.id, constraintDates, availabilityConstraints),
    )
    .filter((member) => !hasSameTimeConflict(member.id, shift, shifts))
    .sort((left, right) => {
      const leftCount = countAssignedShifts(left.id, shifts);
      const rightCount = countAssignedShifts(right.id, shifts);
      if (leftCount !== rightCount) return leftCount - rightCount;
      return left.name.localeCompare(right.name);
    })
    .slice(0, 3);

  return options.map((member) => ({
    staffId: member.id,
    staffName: member.name,
    note: buildRecoveryNote(member.id, shifts),
  }));
}

function buildRecoveryNote(staffId: string, shifts: DraftShift[]): string {
  const assignedCount = countAssignedShifts(staffId, shifts);
  const loadLabel =
    assignedCount === 0
      ? "No shifts yet this week"
      : `${assignedCount} shift${assignedCount === 1 ? "" : "s"} this week`;
  return `${loadLabel}; role match, no approved leave or availability clash, and no same-time conflict.`;
}

function countAssignedShifts(staffId: string, shifts: DraftShift[]): number {
  return shifts.reduce((count, shift) => (shift.staffId === staffId ? count + 1 : count), 0);
}

function isOnApprovedLeave(
  staffId: string,
  shiftDates: string[],
  requests: LeaveRequest[],
): boolean {
  return requests.some(
    (request) =>
      request.state === "approved" &&
      request.staffId === staffId &&
      shiftDates.some((shiftDate) => request.startIso <= shiftDate && request.endIso >= shiftDate),
  );
}

function hasSameTimeConflict(
  staffId: string,
  targetShift: DraftShift,
  shifts: DraftShift[],
): boolean {
  const targetStart = parseMinutes(targetShift.start);
  const targetEnd = shiftEndMinutes(targetShift);
  if (targetStart === null || targetEnd === null) return true;

  return shifts.some((shift) => {
    if (shift.id === targetShift.id || shift.staffId !== staffId) return false;
    if (shift.dayIndex !== targetShift.dayIndex) return false;

    const shiftStart = parseMinutes(shift.start);
    const shiftEnd = shiftEndMinutes(shift);
    if (shiftStart === null || shiftEnd === null) return true;

    return targetStart < shiftEnd && shiftStart < targetEnd;
  });
}

function shiftEndMinutes(shift: DraftShift): number | null {
  const start = parseMinutes(shift.start);
  const end = parseMinutes(shift.end);
  if (start === null || end === null) return null;
  if (end > start) return end;
  return end + 24 * 60;
}

function parseMinutes(value: string): number | null {
  const [hoursText, minutesText] = value.split(":");
  const hours = Number(hoursText);
  const minutes = Number(minutesText);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;
  return hours * 60 + minutes;
}
