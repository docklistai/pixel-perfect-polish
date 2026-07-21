/**
 * The database treats approved one-off unavailability, recurring days off and
 * approved leave as one acknowledgeable scheduling-constraint set, and refuses
 * to publish any of them without an explicit override. The frontend detects the
 * first two as availability clashes and the third as an approved-leave conflict,
 * so the publish boundary sums both counts before deciding the RPC override —
 * an approved-leave-only clash must still be acknowledgeable.
 *
 * The counts come from the two existing detectors; approved-leave conflicts stay
 * in the conflict list alone and are never copied into the availability clashes.
 */
export interface PublishConstraintClashCounts {
  availabilityClashCount: number;
  approvedLeaveClashCount: number;
}

export function acknowledgeableConstraintCount(counts: PublishConstraintClashCounts): number {
  return counts.availabilityClashCount + counts.approvedLeaveClashCount;
}

export function constraintAcknowledgementValue(
  counts: PublishConstraintClashCounts,
  issuesAcknowledged: boolean,
): boolean {
  return acknowledgeableConstraintCount(counts) > 0 && issuesAcknowledged;
}

/**
 * Names every constraint the manager is signing off, so the checkbox matches the
 * override the RPC actually records.
 */
export function constraintAcknowledgementLabel(publishActionLabel: string): string {
  return (
    "I have reviewed the open shifts, conflicts, working-time alerts, leave-data status, and any " +
    `approved leave, approved unavailability or recurring day-off overrides. I still want to ${publishActionLabel} ` +
    "this manager-approved rota snapshot."
  );
}
