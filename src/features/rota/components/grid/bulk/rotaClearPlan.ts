import {
  buildBulkPlan,
  type RotaBulkCellPlan,
  type RotaBulkPlan,
  type RotaBulkTarget,
} from "./rotaBulkPlan";

/** Named so the wording matches the inline editor's clear command exactly. */
export const CLEAR_RECORDS_NOTHING =
  "Clearing removes the shifts only. It does not record leave, sickness or unavailability.";
export const CLEAR_RETURNS_TO_DRAFT =
  "The week returns to Draft. The published rota staff can see is not changed until you publish again.";

/**
 * Removes every shift in the selected cells. Cells that are already empty
 * contribute nothing, so a selection that reaches across blank days still
 * reports an honest count.
 */
export function buildRotaClearPlan(targets: readonly RotaBulkTarget[]): RotaBulkPlan {
  const cells: RotaBulkCellPlan[] = targets.map((target) => ({
    key: target.key,
    label: target.label,
    ops: target.cell.shifts.map((shift) => ({ kind: "remove" as const, shiftId: shift.id })),
    warnings:
      target.cell.shifts.length > 1
        ? [`${target.cell.shifts.length} shifts in this cell will be cleared`]
        : [],
  }));

  return buildBulkPlan(
    "clear",
    cells,
    [],
    [CLEAR_RECORDS_NOTHING, CLEAR_RETURNS_TO_DRAFT],
    targets,
  );
}
