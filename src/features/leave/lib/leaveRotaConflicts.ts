import type { ConflictSummary, DraftShift, StaffMember } from "@/features/rota/types";
import type { LeaveRequest } from "../types";

function approvedLeaveForShift(
  shift: DraftShift,
  requests: LeaveRequest[],
  dayIsoDates: string[],
): LeaveRequest | null {
  if (shift.staffId === null) return null;
  const shiftDate = dayIsoDates[shift.dayIndex];
  if (!shiftDate) return null;
  return (
    requests.find(
      (request) =>
        request.state === "approved" &&
        request.staffId === shift.staffId &&
        request.startIso <= shiftDate &&
        request.endIso >= shiftDate,
    ) ?? null
  );
}

export function withApprovedLeaveConflictStatus(
  shifts: DraftShift[],
  requests: LeaveRequest[],
  dayIsoDates: string[],
): DraftShift[] {
  return shifts.map((shift) =>
    approvedLeaveForShift(shift, requests, dayIsoDates)
      ? { ...shift, status: "conflict", tone: "danger" }
      : shift,
  );
}

export function buildApprovedLeaveConflictSummaries(
  shifts: DraftShift[],
  requests: LeaveRequest[],
  dayIsoDates: string[],
  staff: StaffMember[],
  dayLabels: string[],
): ConflictSummary[] {
  return shifts.flatMap((shift) => {
    const request = approvedLeaveForShift(shift, requests, dayIsoDates);
    if (!request) return [];
    const staffName = staff.find((member) => member.id === shift.staffId)?.name ?? request.n;
    return [
      {
        id: shift.id,
        staff: staffName,
        day: dayLabels[shift.dayIndex] ?? "",
        detail: `${shift.role} shift overlaps approved leave (${request.date})`,
        cause: `${staffName} is scheduled while approved leave is recorded.`,
        guidance: "Reassign the shift or reopen the leave decision before publishing.",
      },
    ];
  });
}
