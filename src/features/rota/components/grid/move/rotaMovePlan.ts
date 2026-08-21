import { isShiftCopyAssignable } from "../../../lib/assignableStaff";
import { targetLeaveWarning } from "../bulk/rotaCellTextPlan";
import { cellKeysEqual } from "../selection/rotaSelectionModel";
import type { ArmedMove, RotaMoveTargetTone } from "./rotaMoveApi";
import type { RotaBulkTarget } from "../bulk/rotaBulkPlan";
import type { DraftShift, RotaDayIndex, StaffMember } from "../../../types";

/**
 * Whether one shift may move to one cell, and what that move is.
 *
 * PURE, AND DELIBERATELY NOT A NEW RULE SET. Moving a shift by dragging it is
 * the same act as editing it, so it answers to the same authorities:
 * `isShiftCopyAssignable` decides who a shift may be assigned to, and
 * `targetLeaveWarning` supplies the advisory the paste and fill paths already
 * show. Nothing here invents a stricter overlap, leave or availability rule —
 * an overlap created by a move stays exactly what an overlap created by typing
 * has always been: an acknowledgeable clash at publication time, never a
 * refusal at write time.
 *
 * WHAT A MOVE MAY CHANGE. Two dimensions, because the grid only has two: the
 * column is the day and the row is the assignment. The patch therefore carries
 * `dayIndex`, `staffId`, or both, and never anything else — times, duration,
 * break, role, department and the colour overrides are not addressable by a
 * drop and must survive it untouched. The shift keeps its id, which is what
 * lets the publish review read the move as one changed shift rather than a
 * removal and an addition.
 *
 * CROSS-WEEK AND CROSS-LOCATION are absent by construction, not by check: every
 * cell in the grid belongs to the one rota week of the one selected location,
 * so no drop target can express either. `guard_shift_write` refuses both
 * server-side regardless.
 */

export const MOVE_READ_ONLY_REASON = "The live rota is unavailable, so shifts cannot be moved.";
export const MOVE_ARCHIVED_REASON = "Archived rota weeks cannot be changed.";
export const MOVE_PENDING_REASON = "Wait for the current rota save to finish.";
export const MOVE_AMBIGUOUS_SOURCE_REASON =
  "This cell holds more than one shift, so there is no single shift to move.";
export const MOVE_OUTSIDE_WEEK_REASON = "A shift can only move inside this rota week.";
export const MOVE_INACTIVE_TARGET_REASON =
  "That team member is not active, so a shift cannot be moved to them.";
export const MOVE_SOURCE_MISSING_REASON = "That shift is no longer on this rota.";

export type RotaMovePlan =
  | { kind: "refused"; reason: string }
  | { kind: "noop" }
  | {
      kind: "move";
      /** Only the dimensions the drop actually changed. Never empty. */
      patch: Partial<DraftShift>;
      /** Advisory only — the move still proceeds. */
      warning: string | null;
      targetLabel: string;
    };

export interface RotaMovePlanInput {
  source: ArmedMove | null;
  /** Null when the drop landed on no addressable cell at all. */
  target: RotaBulkTarget | null;
  assignableStaff: readonly StaffMember[];
  readOnly: boolean;
  weekIsEditable: boolean;
  /** A rota write is already in flight; the runner would refuse a second one. */
  mutationPending: boolean;
  dayCount: number;
}

/**
 * Why this shift cannot be moved anywhere at all, or null when it can.
 *
 * Split out from the destination rules because arming a move has to answer it
 * on its own: refusing at pick-up time is what stops a manager carrying a shift
 * across the grid only to be told at the drop that it was never movable.
 */
export function getRotaMoveSourceRefusal({
  source,
  readOnly,
  weekIsEditable,
  mutationPending,
}: Pick<RotaMovePlanInput, "source" | "readOnly" | "weekIsEditable" | "mutationPending">):
  | string
  | null {
  if (readOnly) return MOVE_READ_ONLY_REASON;
  if (!weekIsEditable) return MOVE_ARCHIVED_REASON;
  if (mutationPending) return MOVE_PENDING_REASON;
  if (!source) return MOVE_SOURCE_MISSING_REASON;
  if (source.shiftsInCell > 1) return MOVE_AMBIGUOUS_SOURCE_REASON;
  return null;
}

export function planRotaShiftMove({
  source,
  target,
  assignableStaff,
  readOnly,
  weekIsEditable,
  mutationPending,
  dayCount,
}: RotaMovePlanInput): RotaMovePlan {
  const refuse = (reason: string): RotaMovePlan => ({ kind: "refused", reason });

  const sourceRefusal = getRotaMoveSourceRefusal({
    source,
    readOnly,
    weekIsEditable,
    mutationPending,
  });
  if (sourceRefusal) return refuse(sourceRefusal);
  if (!source) return refuse(MOVE_SOURCE_MISSING_REASON);
  if (!target || target.key.day < 0 || target.key.day >= dayCount) {
    return refuse(MOVE_OUTSIDE_WEEK_REASON);
  }

  // Dropping a shift back where it came from is a cancelled gesture, not an
  // edit: it must not write, and must not push a history entry that Undo would
  // then spend on nothing.
  if (cellKeysEqual(target.key, source.cell)) return { kind: "noop" };

  // The grid deliberately shows staff who have left but still hold shifts, so
  // their row is a visible drop target that must be refused. Same predicate the
  // duplicate and repeat actions use.
  const targetStaffId = target.openRow ? null : target.staffId;
  if (
    targetStaffId !== null &&
    !isShiftCopyAssignable({ staffId: targetStaffId }, assignableStaff)
  ) {
    return refuse(MOVE_INACTIVE_TARGET_REASON);
  }

  const patch: Partial<DraftShift> = {};
  if (target.key.day !== source.shift.dayIndex) {
    patch.dayIndex = target.key.day as RotaDayIndex;
  }
  if (targetStaffId !== source.shift.staffId) {
    patch.staffId = targetStaffId;
  }
  // Two different cells always differ in row or day, so this cannot be empty —
  // but an empty patch is refused by `updateShiftInput`, so it is worth saying
  // rather than assuming.
  if (Object.keys(patch).length === 0) return { kind: "noop" };

  return {
    kind: "move",
    patch,
    warning: targetLeaveWarning(target),
    targetLabel: target.label,
  };
}

/** How the destination cell should present itself, given the plan for it. */
export function rotaMoveTargetTone(plan: RotaMovePlan): RotaMoveTargetTone {
  if (plan.kind === "refused") return "invalid";
  if (plan.kind === "noop") return "none";
  return plan.warning ? "warn" : "valid";
}
