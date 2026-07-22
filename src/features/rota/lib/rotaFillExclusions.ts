import type { DraftShift, RotaDayIndex, StaffId, StaffMember } from "../types";
import type { LeaveRequest } from "@/features/leave/types";
import { getShiftDurationMinutes, parseHHMMToMinutes } from "./rotaTimeUtils";
import { isoWeekday } from "./recurringDayOffClashes";
import type { ApprovedAvailabilityConstraints } from "./availabilityConstraints";

export type OpenShiftFillOptions = {
  leaveRequests?: LeaveRequest[];
  dayIsoDates?: string[];
  /** Approved recurring days off and one-off unavailability, as loaded by the rota page. */
  constraints?: ApprovedAvailabilityConstraints;
};

export type ExclusionKind = "leave" | "unavailable" | "day-off" | "overlap" | "already-scheduled";

export const EXCLUSION_LABEL: Record<ExclusionKind, string> = {
  leave: "on leave",
  unavailable: "marked unavailable",
  "day-off": "on a recurring day off",
  overlap: "already working an overlapping shift",
  "already-scheduled": "already scheduled that day",
};

function shiftWindow(shift: DraftShift): { start: number; end: number } | null {
  const start = parseHHMMToMinutes(shift.start);
  const duration = getShiftDurationMinutes(shift.start, shift.end);
  if (start === null || duration === null) return null;
  return { start, end: start + duration };
}

function overlaps(first: DraftShift, second: DraftShift): boolean {
  if (first.dayIndex !== second.dayIndex) return false;
  const a = shiftWindow(first);
  const b = shiftWindow(second);
  // An unreadable time is treated as a clash rather than silently double-booked.
  if (!a || !b) return true;
  return a.start < b.end && b.start < a.end;
}

function hasLeaveOnDay(
  staffId: StaffId,
  dayIndex: RotaDayIndex,
  options: OpenShiftFillOptions,
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

function availabilityBlock(
  staffId: StaffId,
  dayIndex: RotaDayIndex,
  options: OpenShiftFillOptions,
): ExclusionKind | null {
  const isoDate = options.dayIsoDates?.[dayIndex];
  const constraints = options.constraints;
  if (!isoDate || !constraints) return null;
  if (constraints.unavailableDatesByStaff.get(staffId)?.has(isoDate)) return "unavailable";
  if (constraints.recurringByStaff.get(staffId)?.has(isoWeekday(isoDate))) return "day-off";
  return null;
}

/**
 * Why one candidate cannot take this shift, or null when they can.
 *
 * Automated fill places at most one shift per staff member per local work date.
 * `shifts` carries assignments made earlier in the same run, so a candidate the
 * fill has just used is excluded from the rest of that day exactly like someone
 * who was already rostered. Overlap is tested first because it is the more
 * specific explanation; the same-day rule then catches non-overlapping splits
 * (9–12 plus 17–22) that the overlap test alone would let through.
 *
 * This is a scheduling-density guard, not a legal working-time limit, and is
 * never described as one.
 */
export function excludeReason(
  member: StaffMember,
  shift: DraftShift,
  shifts: DraftShift[],
  options: OpenShiftFillOptions,
): ExclusionKind | null {
  if (hasLeaveOnDay(member.id, shift.dayIndex, options)) return "leave";
  const availability = availabilityBlock(member.id, shift.dayIndex, options);
  if (availability) return availability;

  const sameStaffOtherShifts = shifts.filter(
    (existing) => existing.staffId === member.id && existing.id !== shift.id,
  );
  if (sameStaffOtherShifts.some((existing) => overlaps(existing, shift))) return "overlap";
  if (sameStaffOtherShifts.some((existing) => existing.dayIndex === shift.dayIndex)) {
    return "already-scheduled";
  }
  return null;
}

/** Manager-facing explanation of why an open shift could not be filled. */
export function describeGap(
  role: string,
  roleMatched: number,
  counts: Map<ExclusionKind, number>,
): string {
  if (roleMatched === 0) return `No active staff hold the ${role} role.`;
  const parts = [...counts.entries()]
    .filter(([, count]) => count > 0)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([kind, count]) => `${count} ${EXCLUSION_LABEL[kind]}`);
  if (parts.length === 0) return `No ${role} colleague is free for this shift.`;
  return `All ${roleMatched} ${role} staff are unavailable — ${parts.join(", ")}.`;
}
