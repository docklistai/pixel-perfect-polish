import type { DraftShift, RotaDayIndex, ShiftId, StaffId, StaffMember } from "../types";
import type { LeaveRequest } from "@/features/leave/types";
import { applyShiftPatch } from "./draftShiftCore";
import type { ApprovedAvailabilityConstraints } from "./availabilityConstraints";
import {
  describeGap,
  excludeReason,
  type ExclusionKind,
  type OpenShiftFillOptions,
} from "./rotaFillExclusions";

export type { OpenShiftFillOptions } from "./rotaFillExclusions";

export type OpenShiftSuggestion = {
  shiftId: ShiftId;
  staffId: StaffId;
  staffName: string;
  role: string;
  dayIndex: RotaDayIndex;
  reason: string;
};

/** An open shift no eligible colleague could take, with the reason it stayed open. */
export type UnfilledOpenShift = {
  shiftId: ShiftId;
  role: string;
  dayIndex: RotaDayIndex;
  reason: string;
};

/** What the manager is shown after a fill: what was assigned and what was not. */
export type OpenShiftFillSummary = {
  suggestions: OpenShiftSuggestion[];
  unfilled: UnfilledOpenShift[];
};

export type OpenShiftFillResult = OpenShiftFillSummary & {
  shifts: DraftShift[];
};

/**
 * Deterministic open-shift fill. Only shifts that are already open are touched;
 * a candidate must hold the shift's role and must not be on leave, marked
 * unavailable, on a recurring day off, already working an overlapping shift, or
 * already scheduled anywhere on that local work date. That last rule keeps the
 * fill to at most one generated shift per person per day; managers can still
 * build split shifts by hand, which this function never touches.
 *
 * Ties break towards whoever has fewest shifts this week, then by staff id, so
 * the same input always produces the same draft. Every result is a manager-
 * reviewed suggestion — nothing here publishes.
 *
 * Contracted hours and working-time limits are deliberately not modelled and are
 * never claimed.
 */
export function fillOpenShiftsWithSuggestions(
  shifts: DraftShift[],
  staff: StaffMember[],
  options: OpenShiftFillOptions = {},
): OpenShiftFillResult {
  const assignedCounts = new Map<StaffId, number>();
  for (const shift of shifts) {
    if (shift.staffId === null) continue;
    assignedCounts.set(shift.staffId, (assignedCounts.get(shift.staffId) ?? 0) + 1);
  }

  const suggestions: OpenShiftSuggestion[] = [];
  const unfilled: UnfilledOpenShift[] = [];
  // Assignments accumulate as we go, so a later open shift sees the earlier fill.
  let working = [...shifts];

  const nextShifts = shifts.map((shift) => {
    if (shift.staffId !== null) return shift;

    const roleMatched = staff.filter((member) => member.role === shift.role);
    const counts = new Map<ExclusionKind, number>();
    const eligible: StaffMember[] = [];
    for (const member of roleMatched) {
      const reason = excludeReason(member, shift, working, options);
      if (reason) counts.set(reason, (counts.get(reason) ?? 0) + 1);
      else eligible.push(member);
    }

    const candidate = eligible.sort(
      (a, b) =>
        (assignedCounts.get(a.id) ?? 0) - (assignedCounts.get(b.id) ?? 0) ||
        String(a.id).localeCompare(String(b.id)),
    )[0];

    if (!candidate) {
      unfilled.push({
        shiftId: shift.id,
        role: shift.role,
        dayIndex: shift.dayIndex,
        reason: describeGap(shift.role, roleMatched.length, counts),
      });
      return shift;
    }

    assignedCounts.set(candidate.id, (assignedCounts.get(candidate.id) ?? 0) + 1);
    suggestions.push({
      shiftId: shift.id,
      staffId: candidate.id,
      staffName: candidate.name,
      role: shift.role,
      dayIndex: shift.dayIndex,
      reason: "Role match, free of leave, availability blocks and any other shift that day",
    });

    const filled = applyShiftPatch(shift, {
      staffId: candidate.id,
      status: "scheduled",
      tone: candidate.tone,
    });
    working = working.map((entry) => (entry.id === shift.id ? filled : entry));
    return filled;
  });

  return { shifts: nextShifts, suggestions, unfilled };
}

export async function applyLiveOpenShiftSuggestions({
  shifts,
  staff,
  leaveRequests,
  dayIsoDates,
  constraints,
  updateShift,
}: {
  shifts: DraftShift[];
  staff: StaffMember[];
  leaveRequests: LeaveRequest[];
  dayIsoDates: string[];
  constraints?: ApprovedAvailabilityConstraints;
  updateShift: (shiftId: ShiftId, patch: Partial<DraftShift>) => void | Promise<void>;
}): Promise<OpenShiftFillSummary> {
  const result = fillOpenShiftsWithSuggestions(shifts, staff, {
    leaveRequests,
    dayIsoDates,
    constraints,
  });
  for (const suggestion of result.suggestions) {
    await updateShift(suggestion.shiftId, {
      staffId: suggestion.staffId,
      status: "scheduled",
      tone: "info",
      edited: true,
    });
  }
  return { suggestions: result.suggestions, unfilled: result.unfilled };
}
