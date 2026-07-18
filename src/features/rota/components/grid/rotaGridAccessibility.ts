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

export function buildRotaCellAccessibleName({
  cellLabel,
  shifts,
  readOnly,
  leaveState,
  availabilityHint,
}: {
  cellLabel: string;
  shifts: DraftShift[];
  readOnly: boolean;
  leaveState?: "approved" | "pending";
  availabilityHint?: "unavailable" | "day-off";
}): string {
  if (shifts.length > 0) {
    const shiftSummary = shifts.map(shiftAccessibleName).join("; ");
    const action = readOnly
      ? "Read only"
      : "Press Enter or Space to open shift details, or M for shift actions";
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
  const action = readOnly ? "Read only" : "Press Enter or Space to add a shift";
  return cellLabel + ": " + constraint + ". " + action + ".";
}
