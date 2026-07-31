import { planRotaCellFromShifts } from "./rotaCellShiftPlan";
import { DEPARTMENT_NOTE } from "./rotaPastePlan";
import { CLEAR_RETURNS_TO_DRAFT } from "./rotaClearPlan";
import {
  buildBulkPlan,
  type RotaBulkBlocker,
  type RotaBulkCellPlan,
  type RotaBulkPlan,
  type RotaBulkTarget,
} from "./rotaBulkPlan";

export const EMPTY_SOURCE_NOTE =
  "The source cells are empty, so filling will clear every target cell in the selection.";

/**
 * Fill down and fill right.
 *
 * The source is repeated, never interpolated: the top row (or left column) is
 * written into each remaining row (or column) exactly as it stands. An empty
 * source is a real instruction — Excel blanks the range — so it clears the
 * targets, and says so before it does.
 *
 * The source cell's shifts are replanned against each target **structurally**.
 * That is what makes assignment follow the target — a staff shift filled into the
 * open row becomes an open shift, and an open shift filled onto a staff row is
 * assigned to that staff member — without the source ever passing through a text
 * format that cannot represent every field it carries.
 *
 * It follows that this takes no `workspaceRoles`: there is no typed text here to
 * resolve a role name against. That parameter belongs to the paste path alone.
 */
export function buildRotaFillPlan({
  rows,
  direction,
}: {
  /** Selected cells, row-major. */
  rows: RotaBulkTarget[][];
  direction: "down" | "right";
}): RotaBulkPlan {
  const kind = direction === "down" ? "fill-down" : "fill-right";
  const targets = rows.flat();
  const blockers: RotaBulkBlocker[] = [];
  const cells: RotaBulkCellPlan[] = [];

  const sources = direction === "down" ? (rows[0] ?? []) : rows.map((row) => row[0]!);
  const followers =
    direction === "down" ? rows.slice(1).map((row) => row) : rows.map((row) => row.slice(1));

  if (sources.length === 0 || followers.every((row) => row.length === 0)) {
    return buildBulkPlan(
      kind,
      [],
      [
        {
          label:
            direction === "down"
              ? "Nothing below the source row"
              : "Nothing right of the source column",
          message:
            direction === "down"
              ? "Select at least two rows so there is somewhere to fill down into."
              : "Select at least two days so there is somewhere to fill right into.",
        },
      ],
      [],
      targets,
    );
  }

  // Shifts, not text. A role containing "/" needs no special handling here,
  // because nothing is re-read through the split-shift grammar.
  const sourceShifts = sources.map((source) => source.cell.shifts);

  const notes = [DEPARTMENT_NOTE, CLEAR_RETURNS_TO_DRAFT];
  if (sourceShifts.every((shifts) => shifts.length === 0)) notes.unshift(EMPTY_SOURCE_NOTE);

  followers.forEach((row, rowOffset) => {
    row.forEach((target, columnOffset) => {
      const shifts = direction === "down" ? sourceShifts[columnOffset] : sourceShifts[rowOffset];
      if (shifts === undefined) return;
      const planned = planRotaCellFromShifts({ target, sourceShifts: shifts });
      if (planned.ok) cells.push(planned.plan);
      else blockers.push(planned.blocker);
    });
  });

  return buildBulkPlan(kind, cells, blockers, notes, targets);
}
