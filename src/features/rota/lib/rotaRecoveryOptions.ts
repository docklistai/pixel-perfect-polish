import type { LeaveRequest } from "@/features/leave/types";
import type { DraftShift, StaffMember } from "../types";
import type { ApprovedAvailabilityConstraints } from "./availabilityConstraints";
import { toAvailabilityFacts, toStaffSchedulingFact } from "./rotaFillExclusions";
import { committedShiftsFrom, draftShiftTimes } from "./scheduling/draftShiftAdapter";
import {
  compareCandidates,
  hardExclusionFor,
  scheduledMinutesFor,
  type Candidate,
} from "./scheduling/eligibility";
import { normaliseRoleKey } from "./scheduling/shiftSignature";

/**
 * Replacement suggestions for a shift that has lost its assignee.
 *
 * This now answers eligibility with the same engine the automatic fill uses. It
 * previously did not: it counted approved leave only, so a person with a pending
 * leave request was refused by the fill and simultaneously recommended here — on
 * the same page. It also ordered ties by name where the fill ordered by id, so the
 * two surfaces could prefer different people from an identical candidate set.
 */

export type RotaRecoveryOption = {
  staffId: string;
  staffName: string;
  note: string;
};

export const NO_SAFE_RECOVERY_OPTIONS =
  "No safe suggestions found; manager can still edit manually.";

/** How many suggestions a manager is offered. More than this is noise. */
const MAX_OPTIONS = 3;

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
  if (dayIsoDates[shift.dayIndex] === undefined) return [];

  const target = draftShiftTimes(shift, dayIsoDates);
  const requiredRoleKey = normaliseRoleKey(shift.role);
  const committed = committedShiftsFrom(shifts, dayIsoDates);
  const availability = toAvailabilityFacts({
    leaveRequests,
    dayIsoDates,
    constraints: availabilityConstraints,
  });

  const candidates: Candidate[] = [];
  for (const member of staff) {
    if (member.id === excludeStaffId) continue;
    const excluded = hardExclusionFor({
      staff: toStaffSchedulingFact(member),
      target,
      requiredRoleKey,
      committed,
      availability,
      excludeShiftId: shift.id,
    });
    if (excluded) continue;
    candidates.push({
      staff: toStaffSchedulingFact(member),
      scheduledMinutes: scheduledMinutesFor(member.id, committed),
    });
  }

  return candidates
    .sort((left, right) => compareCandidates(left, right, shift.departmentId ?? ""))
    .slice(0, MAX_OPTIONS)
    .map((candidate) => ({
      staffId: candidate.staff.id,
      staffName: candidate.staff.name,
      note: buildRecoveryNote(candidate.scheduledMinutes),
    }));
}

function buildRecoveryNote(scheduledMinutes: number): string {
  const hours = Math.round((scheduledMinutes / 60) * 10) / 10;
  const loadLabel =
    scheduledMinutes === 0 ? "No shifts yet this week" : `${hours}h scheduled this week`;
  return `${loadLabel}; role match, and no leave, availability or overlapping-shift clash.`;
}
