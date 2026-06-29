import type { DraftShift, RotaDayIndex, ShiftId, StaffId, StaffMember } from "../types";
import type { LeaveRequest } from "@/features/leave/types";
import { applyShiftPatch } from "./draftShiftCore";

export type OpenShiftSuggestion = {
  shiftId: ShiftId;
  staffId: StaffId;
  staffName: string;
  role: string;
  dayIndex: RotaDayIndex;
  reason: string;
};

export function fillOpenShiftsWithSuggestions(
  shifts: DraftShift[],
  staff: StaffMember[],
  options: { leaveRequests?: LeaveRequest[]; dayIsoDates?: string[] } = {},
): { shifts: DraftShift[]; suggestions: OpenShiftSuggestion[] } {
  const assignedCounts = new Map<StaffId, number>();
  const assignedDays = new Map<StaffId, Set<number>>();
  for (const shift of shifts) {
    if (shift.staffId === null) continue;
    assignedCounts.set(shift.staffId, (assignedCounts.get(shift.staffId) ?? 0) + 1);
    const days = assignedDays.get(shift.staffId) ?? new Set<number>();
    days.add(shift.dayIndex);
    assignedDays.set(shift.staffId, days);
  }

  const suggestions: OpenShiftSuggestion[] = [];
  const nextShifts = shifts.map((shift) => {
    if (shift.staffId !== null) return shift;

    const candidate = [...staff]
      .filter((member) => member.role === shift.role)
      .filter((member) => !hasLeaveOnDay(member.id, shift.dayIndex, options))
      .filter(
        (member) =>
          !(assignedDays.get(member.id)?.has(shift.dayIndex) ?? false) &&
          !shifts.some(
            (existing) =>
              existing.staffId === member.id &&
              existing.dayIndex === shift.dayIndex &&
              existing.id !== shift.id,
          ),
      )
      .sort((a, b) => (assignedCounts.get(a.id) ?? 0) - (assignedCounts.get(b.id) ?? 0))[0];

    if (!candidate) return shift;

    assignedCounts.set(candidate.id, (assignedCounts.get(candidate.id) ?? 0) + 1);
    const nextDays = assignedDays.get(candidate.id) ?? new Set<number>();
    nextDays.add(shift.dayIndex);
    assignedDays.set(candidate.id, nextDays);
    suggestions.push({
      shiftId: shift.id,
      staffId: candidate.id,
      staffName: candidate.name,
      role: shift.role,
      dayIndex: shift.dayIndex,
      reason: "Role match with fewer assigned shifts and no leave clash this week",
    });

    return applyShiftPatch(shift, {
      staffId: candidate.id,
      status: "scheduled",
      tone: candidate.tone,
    });
  });

  return { shifts: nextShifts, suggestions };
}

export async function applyLiveOpenShiftSuggestions({
  shifts,
  staff,
  leaveRequests,
  dayIsoDates,
  updateShift,
}: {
  shifts: DraftShift[];
  staff: StaffMember[];
  leaveRequests: LeaveRequest[];
  dayIsoDates: string[];
  updateShift: (shiftId: ShiftId, patch: Partial<DraftShift>) => void | Promise<void>;
}): Promise<OpenShiftSuggestion[]> {
  const result = fillOpenShiftsWithSuggestions(shifts, staff, { leaveRequests, dayIsoDates });
  for (const suggestion of result.suggestions) {
    await updateShift(suggestion.shiftId, {
      staffId: suggestion.staffId,
      status: "scheduled",
      tone: "info",
      edited: true,
    });
  }
  return result.suggestions;
}

function hasLeaveOnDay(
  staffId: StaffId,
  dayIndex: RotaDayIndex,
  options: { leaveRequests?: LeaveRequest[]; dayIsoDates?: string[] },
): boolean {
  const isoDate = options.dayIsoDates?.[dayIndex];
  if (!isoDate) return false;
  return (options.leaveRequests ?? []).some(
    (request) =>
      request.staffId === staffId &&
      (request.state === "approved" || request.state === "pending") &&
      request.startIso <= isoDate &&
      request.endIso >= isoDate,
  );
}
