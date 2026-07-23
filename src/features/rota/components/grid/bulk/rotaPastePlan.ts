import { planRotaCellFromText } from "./rotaCellTextPlan";
import { CLEAR_RETURNS_TO_DRAFT } from "./rotaClearPlan";
import {
  buildBulkPlan,
  type RotaBulkBlocker,
  type RotaBulkCellPlan,
  type RotaBulkPlan,
  type RotaBulkTarget,
} from "./rotaBulkPlan";

export const DEPARTMENT_NOTE =
  "Departments follow the target, not the copied cell. A shift that is replaced keeps its own " +
  "department; a new shift takes the target staff member's department, and a new open shift takes " +
  "the workspace default. Tab separated text cannot carry a department.";

export type RotaPasteGeometry = {
  /** Selected cells, row-major, as laid out on screen. */
  rows: RotaBulkTarget[][];
};

/**
 * The rectangle a pasted block lands on.
 *
 * A copied block is anchored at the selection's top-left and takes its shape
 * from there, which is what a manager means when they click one cell and paste
 * three days of shifts. A single copied cell is the exception: it repeats
 * across whatever is selected, so the selection is kept as it stands.
 *
 * The result is not clamped to the grid on purpose. Rows or days that do not
 * exist simply produce no targets, and the planner reports that as an overflow
 * rather than quietly shrinking the block to what happened to fit.
 */
export function pastedBlockRect<
  T extends { topRow: number; bottomRow: number; leftDay: number; rightDay: number },
>(rect: T | null, blockRows: number, blockCols: number): T | null {
  if (!rect) return null;
  if (blockRows === 1 && blockCols === 1) return rect;
  return {
    ...rect,
    bottomRow: Math.max(rect.bottomRow, rect.topRow + blockRows - 1),
    rightDay: Math.max(rect.rightDay, rect.leftDay + blockCols - 1),
  };
}

function overflowBlocker(
  pastedRows: number,
  pastedCols: number,
  availableRows: number,
  availableCols: number,
): RotaBulkBlocker | null {
  if (pastedRows <= availableRows && pastedCols <= availableCols) return null;
  const parts: string[] = [];
  if (pastedRows > availableRows) {
    parts.push(`${pastedRows} rows but only ${availableRows} remain below the active cell`);
  }
  if (pastedCols > availableCols) {
    parts.push(`${pastedCols} columns but only ${availableCols} remain to the right`);
  }
  return {
    label: "Pasted block does not fit",
    message:
      `The copied block is ${parts.join(", and ")}. ` +
      "Nothing was pasted — move the selection or copy a smaller block.",
  };
}

/**
 * Plans a paste over the selected rectangle.
 *
 * Two shapes are accepted. A single copied cell fills every selected cell, which
 * is what a manager means when they copy one shift and select a block. Anything
 * larger anchors at the top-left of the selection and must fit exactly — the
 * alternative, clipping to what fits, would silently drop rota the manager
 * believed they had pasted.
 */
export function buildRotaPastePlan({
  geometry,
  pasted,
  workspaceRoles,
}: {
  geometry: RotaPasteGeometry;
  pasted: readonly (readonly string[])[];
  workspaceRoles?: readonly string[];
}): RotaBulkPlan {
  const targets = geometry.rows.flat();
  const availableRows = geometry.rows.length;
  const availableCols = geometry.rows[0]?.length ?? 0;
  const pastedRows = pasted.length;
  const pastedCols = pasted[0]?.length ?? 0;
  const singleCell = pastedRows === 1 && pastedCols === 1;

  const notes = [DEPARTMENT_NOTE, CLEAR_RETURNS_TO_DRAFT];
  if (singleCell && targets.length > 1) {
    notes.unshift(`One copied cell will be repeated across all ${targets.length} selected cells.`);
  }

  const overflow = singleCell
    ? null
    : overflowBlocker(pastedRows, pastedCols, availableRows, availableCols);
  if (overflow) return buildBulkPlan("paste", [], [overflow], notes, targets);

  const cells: RotaBulkCellPlan[] = [];
  const blockers: RotaBulkBlocker[] = [];

  geometry.rows.forEach((row, rowIndex) => {
    row.forEach((target, columnIndex) => {
      // Outside a single-cell fill, targets past the pasted block keep whatever
      // they already hold — a smaller paste never reaches them.
      const text = singleCell ? pasted[0]![0]! : pasted[rowIndex]?.[columnIndex];
      if (text === undefined) return;
      const planned = planRotaCellFromText({ target, text, workspaceRoles });
      if (planned.ok) cells.push(planned.plan);
      else blockers.push(planned.blocker);
    });
  });

  return buildBulkPlan("paste", cells, blockers, notes, targets);
}
