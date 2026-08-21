import { formatShiftTime } from "../../lib/draftRota";
import type { DraftShift } from "../../types";

export type RotaGridArrowKey = "ArrowRight" | "ArrowLeft" | "ArrowUp" | "ArrowDown";

export function nextRotaGridPosition(
  rowIndex: number,
  dayIndex: number,
  key: RotaGridArrowKey,
): { rowIndex: number; dayIndex: number } {
  return {
    rowIndex: key === "ArrowUp" ? rowIndex - 1 : key === "ArrowDown" ? rowIndex + 1 : rowIndex,
    dayIndex: key === "ArrowLeft" ? dayIndex - 1 : key === "ArrowRight" ? dayIndex + 1 : dayIndex,
  };
}

/**
 * Accessible name for the inline shift editor: names the staff member and day
 * being edited and states the expected format, so a screen-reader user knows
 * whose shift on which date the free-text input changes.
 */
export function inlineEditorAccessibleName(contextLabel: string): string {
  return (
    "Edit shift for " +
    contextLabel +
    ". Enter times like 9-5, open 6-11 bar, clear, or 9-12 / 17-22. Press Enter to save, Escape to cancel."
  );
}

function shiftAccessibleName(shift: DraftShift): string {
  const role = shift.deptOverride ?? shift.role;
  const kind = shift.staffId === null ? "Open " + role + " shift" : role + " shift";
  const states = [
    shift.status === "conflict" ? "conflict" : "",
    shift.edited ? "edited in draft" : "",
  ].filter(Boolean);
  return (
    kind +
    ", " +
    formatShiftTime(shift.start, shift.end) +
    (states.length > 0 ? ", " + states.join(", ") : "")
  );
}

/**
 * What this cell is while a move is armed. Absent when none is.
 *
 * A drag is invisible without sight, so the cell has to say what it currently
 * is — the shift being carried, a place that would take it, a place that would
 * take it with a warning, or one that would refuse.
 */
export type RotaCellMoveState = "source" | "valid" | "warn" | "invalid" | "none";

const MOVE_STATE_TEXT: Readonly<Record<RotaCellMoveState, string>> = {
  source: "Moving this shift. Choose another cell, or press Escape to cancel",
  valid: "Press Enter to move the shift here",
  warn: "Press Enter to move the shift here, despite the warning above",
  invalid: "The shift cannot be moved here",
  none: "",
};

export function buildRotaCellAccessibleName({
  cellLabel,
  shifts,
  readOnly,
  leaveState,
  availabilityHint,
  moveState,
}: {
  cellLabel: string;
  shifts: DraftShift[];
  readOnly: boolean;
  leaveState?: "approved" | "pending";
  availabilityHint?: "unavailable" | "day-off";
  moveState?: RotaCellMoveState;
}): string {
  // An armed move replaces the cell's ordinary instructions: while carrying a
  // shift, what this cell would do with it is the only relevant action.
  const moveText = moveState ? MOVE_STATE_TEXT[moveState] : "";
  if (shifts.length > 0) {
    const shiftSummary = shifts.map(shiftAccessibleName).join("; ");
    const action = readOnly
      ? "Read only"
      : moveText || "Press Enter or Space to open shift details, or M for shift actions";
    return cellLabel + ": " + shiftSummary + ". " + action + ".";
  }

  const constraint =
    leaveState === "approved"
      ? "Approved leave"
      : leaveState === "pending"
        ? "Pending leave request"
        : availabilityHint === "unavailable"
          ? "Approved unavailable date"
          : availabilityHint === "day-off"
            ? "Approved recurring day off"
            : "No shift";
  const action = readOnly ? "Read only" : moveText || "Press Enter or Space to add a shift";
  return cellLabel + ": " + constraint + ". " + action + ".";
}
