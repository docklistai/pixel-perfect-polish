import { serialiseRotaCell } from "../clipboard/rotaCellSerializer";
import { planRotaCellFromText } from "./rotaCellTextPlan";
import { DEPARTMENT_NOTE } from "./rotaPastePlan";
import { CLEAR_RETURNS_TO_DRAFT } from "./rotaClearPlan";
import { roleHasAmbiguousSlash, SLASH_ROLE_MESSAGE } from "./rotaSlashRoleGuard";
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
 * The source cell is re-serialised into cell text and replanned against each
 * target, which is what makes assignment follow the target: a staff shift filled
 * into the open row becomes an open shift, and an open shift filled onto a staff
 * row is assigned to that staff member.
 */
export function buildRotaFillPlan({
  rows,
  direction,
  workspaceRoles,
}: {
  /** Selected cells, row-major. */
  rows: RotaBulkTarget[][];
  direction: "down" | "right";
  workspaceRoles?: readonly string[];
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

  const sourceTexts = sources.map((source) => {
    if (source.cell.shifts.some((shift) => roleHasAmbiguousSlash(shift.role))) {
      blockers.push({
        label: source.label,
        message: `This cell cannot be used as a fill source: ${SLASH_ROLE_MESSAGE}`,
      });
      return "";
    }
    // Assignment follows the target: an open source filled onto a staff row is
    // assigned there, so the "open" token is dropped and the target's own
    // staffId decides. The open row still forces its targets open.
    return serialiseRotaCell(source.cell.shifts, { omitOpenToken: true });
  });

  const notes = [DEPARTMENT_NOTE, CLEAR_RETURNS_TO_DRAFT];
  if (sourceTexts.every((text) => text === "")) notes.unshift(EMPTY_SOURCE_NOTE);

  followers.forEach((row, rowOffset) => {
    row.forEach((target, columnOffset) => {
      const text = direction === "down" ? sourceTexts[columnOffset] : sourceTexts[rowOffset];
      if (text === undefined) return;
      const planned = planRotaCellFromText({ target, text, workspaceRoles });
      if (planned.ok) cells.push(planned.plan);
      else blockers.push(planned.blocker);
    });
  });

  return buildBulkPlan(kind, cells, blockers, notes, targets);
}
