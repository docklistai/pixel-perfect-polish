import { getWeekDateIsoLabels } from "@/features/rota/lib/weekHelpers";
import type { ConflictSummary, DraftShift, StaffMember } from "@/features/rota/types";
import type { LeaveRequest } from "../types";

function approvedLeaveForShift(
  shift: DraftShift,
  requests: LeaveRequest[],
  weekOffset: number,
): LeaveRequest | null {
  if (shift.staffId === null) return null;
  const shiftDate = getWeekDateIsoLabels(weekOffset)[shift.dayIndex];
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
  weekOffset: number,
): DraftShift[] {
  return shifts.map((shift) =>
    approvedLeaveForShift(shift, requests, weekOffset)
      ? { ...shift, status: "conflict", tone: "danger" }
      : shift,
  );
}

export function buildApprovedLeaveConflictSummaries(
  shifts: DraftShift[],
  requests: LeaveRequest[],
  weekOffset: number,
  staff: StaffMember[],
  dayLabels: string[],
): ConflictSummary[] {
  return shifts.flatMap((shift) => {
    const request = approvedLeaveForShift(shift, requests, weekOffset);
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
