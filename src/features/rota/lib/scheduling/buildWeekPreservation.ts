import { datesTouchedByInterval } from "./calendarInterval";
import { timesOf } from "./buildWeekAssignment";
import type { AvailabilityFacts, StaffSchedulingFact } from "./eligibility";
import type { ExistingShiftFact, PreservedSummary, ProposalWarning } from "./buildWeekProposal";

/**
 * What Build leaves alone, and what it says about it.
 *
 * An existing assignment is never removed, reassigned or edited — there is no
 * operation kind that could express it. A clash with leave or unavailability is
 * therefore reported rather than corrected: the manager decides, and the
 * proposal is honest about the fact that it did not act.
 */

/** Warns where an existing assignment sits on approved leave or unavailability. */
export function existingAssignmentClashWarnings(
  existingShifts: readonly ExistingShiftFact[],
  staffById: ReadonlyMap<string, StaffSchedulingFact>,
  availability: AvailabilityFacts,
): ProposalWarning[] {
  const warnings: ProposalWarning[] = [];
  for (const shift of existingShifts) {
    const staffId = shift.staffId;
    if (staffId === null) continue;
    const member = staffById.get(staffId);
    if (!member) continue;
    const dates = datesTouchedByInterval(timesOf(shift.signature));
    const clash = dates.some(
      (date) =>
        availability.approvedLeaveDatesByStaff.get(staffId)?.has(date) ||
        availability.unavailableDatesByStaff.get(staffId)?.has(date),
    );
    if (!clash) continue;
    warnings.push({
      code: "existing-assignment-clash",
      message: `${member.name} is already scheduled on a day they have approved leave or unavailability. Build has left this shift exactly as it is.`,
      shiftId: shift.id,
      staffId,
      signature: shift.signature,
    });
  }
  return warnings;
}

/** Stated positively, so a manager can read what will survive the apply. */
export function preservedSummary(
  existingShifts: readonly ExistingShiftFact[],
  openShiftsBeingAssigned: number,
): PreservedSummary {
  const assignedShifts = existingShifts.filter((shift) => shift.staffId !== null).length;
  return {
    assignedShifts,
    openShifts: existingShifts.length - assignedShifts,
    openShiftsBeingAssigned,
  };
}
