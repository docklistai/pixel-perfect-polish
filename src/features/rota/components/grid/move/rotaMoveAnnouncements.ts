import type { RotaMovePlan } from "./rotaMovePlan";
import type { DraftShift } from "../../../types";

/**
 * What the grid's polite live region says during a move.
 *
 * A drag is invisible without sight, so these are not decoration: they are the
 * whole interaction for a screen-reader user. Kept separate from the rules so
 * the wording can be tuned without anyone touching what is legal, and so the
 * planner stays a pure decision with no copy in it.
 */

export const MOVE_CANCELLED_MESSAGE = "Move cancelled.";
export const MOVE_FAILED_MESSAGE = "The shift was not moved.";

function shiftLabel(shift: DraftShift): string {
  return `${shift.deptOverride ?? shift.role} shift`;
}

function warningClause(warning: string | null): string {
  return warning ? ` Warning: this cell ${warning}.` : "";
}

/**
 * Spoken when a move is armed, naming the shift and how to finish or abandon it.
 *
 * Both input paths are named because both reach this: the menu arms a move on a
 * phone, where there are no arrow keys to press, and on a desktop, where there
 * is no cell to tap.
 */
export function describeRotaMoveArmed(shift: DraftShift, sourceLabel: string): string {
  return (
    `Moving ${shiftLabel(shift)} from ${sourceLabel}. ` +
    "Choose another cell with the arrow keys and press Enter, or tap one. Escape cancels."
  );
}

/** Spoken as each candidate destination is proposed. */
export function describeRotaMove(shift: DraftShift, plan: RotaMovePlan): string {
  if (plan.kind === "refused") return plan.reason;
  if (plan.kind === "noop") return "Back where it started. Press Escape to cancel the move.";
  return `Move ${shiftLabel(shift)} to ${plan.targetLabel}.${warningClause(plan.warning)}`;
}

/** Spoken once the write has settled against server truth. */
export function describeRotaMoveResult(
  shift: DraftShift,
  targetLabel: string,
  warning: string | null,
): string {
  return `Moved ${shiftLabel(shift)} to ${targetLabel}.${warningClause(warning)}`;
}
