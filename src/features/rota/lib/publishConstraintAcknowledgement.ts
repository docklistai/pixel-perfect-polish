/**
 * The database treats approved one-off unavailability, recurring days off,
 * approved leave and overlapping assigned shifts as one acknowledgeable
 * scheduling-constraint set, and refuses to publish any of them without an
 * explicit override. The frontend detects the first two as availability
 * clashes, the third as an approved-leave conflict and the fourth as a local
 * conflict, so the publish boundary sums all three counts before deciding the
 * RPC override — an approved-leave-only or overlap-only clash must still be
 * acknowledgeable.
 *
 * MIRROR CONTRACT. `rpc_publish_rota_week` decides what to refuse and this
 * module decides what to acknowledge, independently: the RPC's refusal reaches
 * the client through `toSafeBusinessMessage`, which discards the PostgrestError
 * `detail` carrying `scheduling_constraint_clashes`. So a clash kind the
 * database knows about and this sum does not would refuse a publication the
 * dialog can never acknowledge, hard-blocking the manager. Any change to the
 * RPC's clash set must change this sum in the same commit, and vice versa.
 *
 * `overlappingShiftCount` counts unique affected SHIFTS (the size of
 * `localConflictShiftIds`), not overlapping pairs, because that is what the
 * RPC's `overlapping_shift` kind emits — one row per shift, deduplicated. Two
 * mutually overlapping shifts are therefore two, not one.
 *
 * The counts come from the existing detectors; approved-leave conflicts stay in
 * the conflict list alone and are never copied into the availability clashes.
 */
export interface PublishConstraintClashCounts {
  availabilityClashCount: number;
  approvedLeaveClashCount: number;
  overlappingShiftCount: number;
}

export function acknowledgeableConstraintCount(counts: PublishConstraintClashCounts): number {
  return (
    counts.availabilityClashCount + counts.approvedLeaveClashCount + counts.overlappingShiftCount
  );
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
    "overlapping shifts, approved leave, approved unavailability or recurring day-off overrides. " +
    `I still want to ${publishActionLabel} this manager-approved rota snapshot.`
  );
}
