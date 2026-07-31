import { isoWeekday } from "../recurringDayOffClashes";
import { datesTouchedByInterval, intervalConflict, type LocalShiftTimes } from "./calendarInterval";
import type {
  AvailabilityFacts,
  CommittedShift,
  HardExclusion,
  StaffSchedulingFact,
} from "./hardExclusion";

/**
 * One eligibility authority for automatic scheduling.
 *
 * Four separate implementations of this question used to coexist and disagree:
 * the open-shift fill excluded pending leave while the recovery panel beside it
 * did not, the fill checked one date while recovery checked both dates of an
 * overnight shift, and two of the four treated an unreadable time as safe. A
 * manager could be refused a person by one surface and offered the same person by
 * another on the same screen.
 *
 * This file holds the **decision**. The vocabulary it decides over lives in
 * `hardExclusion.ts`, the ordering of the people it lets through lives in
 * `candidateOrder.ts`, and the wording of a refusal lives in
 * `exclusionMessages.ts`. All four are re-exported here, so `eligibility.ts`
 * remains the single import site every caller already uses.
 */

export {
  emptyAvailabilityFacts,
  type AvailabilityFacts,
  type BalancingSignal,
  type CommittedShift,
  type HardExclusion,
  type StaffSchedulingFact,
} from "./hardExclusion";
export { compareCandidates, scheduledMinutesFor, type Candidate } from "./candidateOrder";
export { describeExclusionCounts, HARD_EXCLUSION_LABEL } from "./exclusionMessages";

function dateConstraint(
  staffId: string,
  dates: readonly string[],
  availability: AvailabilityFacts,
): HardExclusion | null {
  for (const date of dates) {
    if (availability.approvedLeaveDatesByStaff.get(staffId)?.has(date)) return "approved-leave";
    if (availability.pendingLeaveDatesByStaff.get(staffId)?.has(date)) return "pending-leave";
    if (availability.unavailableDatesByStaff.get(staffId)?.has(date)) return "one-off-unavailable";
    if (availability.recurringWeekdaysByStaff.get(staffId)?.has(isoWeekday(date))) {
      return "recurring-day-off";
    }
  }
  return null;
}

/**
 * The single reason this candidate cannot take this shift, or null when they can.
 *
 * Checked in order of specificity so the manager reads the most useful
 * explanation: what the person is (role, active), then what they have arranged
 * (leave, days off, unavailability), then what they are already doing (overlap).
 *
 * `committed` must include assignments made earlier in the same planning pass, so
 * a person the planner has just used is excluded from an overlapping shift exactly
 * as if they had been rostered by hand.
 */
export function hardExclusionFor({
  staff,
  target,
  requiredRoleKey,
  committed,
  availability,
  excludeShiftId,
}: {
  staff: StaffSchedulingFact;
  target: LocalShiftTimes;
  requiredRoleKey: string;
  committed: readonly CommittedShift[];
  availability: AvailabilityFacts;
  /** The shift being filled, so it never conflicts with itself. */
  excludeShiftId?: string;
}): HardExclusion | null {
  if (!staff.active) return "inactive";
  if (staff.roleKey !== requiredRoleKey) return "role-mismatch";

  const dates = datesTouchedByInterval(target);
  if (dates.length === 0) return "unreadable-times";

  const constraint = dateConstraint(staff.id, dates, availability);
  if (constraint) return constraint;

  for (const other of committed) {
    if (other.staffId !== staff.id) continue;
    if (excludeShiftId !== undefined && other.shiftId === excludeShiftId) continue;
    const conflict = intervalConflict(target, other.times);
    if (conflict === "unreadable") return "unreadable-times";
    if (conflict === "overlap") return "interval-conflict";
  }

  return null;
}
