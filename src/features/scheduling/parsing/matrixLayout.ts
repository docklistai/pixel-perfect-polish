import { errorDiagnostic, type ParseDiagnostic } from "./parseDiagnostics";
import { readMatrixHeader, type DayColumn } from "./matrixHeaders";
import { readMatrixCell } from "./matrixCell";
import type { DateOrder } from "./explicitDateFormat";

/**
 * A staff × day grid, turned into the rows the long-format parser already reads.
 *
 * This layer only ever *rearranges*. It decides which cell belongs to which day
 * and which person, and then hands the result to the existing parser as if it
 * had been pasted in long format. Staff resolution, role spelling, time
 * meaning, overnight, duplicates, the operation ceiling, the preview and the
 * atomic apply all stay exactly where they were — there is no second import
 * path and no second set of rules.
 *
 * Every cell that held anything comes back, readable or not, carrying the
 * coordinates it came from. A manager fixing a grid needs to be told "row 4,
 * Tuesday", not "row 12" of a table they never wrote.
 */

/** The long-format table this produces. Break and Department are left to default. */
export const MATRIX_HEADER = ["Date", "Staff", "Role", "Start", "End"] as const;

/** Where a synthesised row came from, in the manager's own grid. */
export type MatrixOrigin = {
  /** 1-based row in the pasted grid, counting the header as row 1. */
  row: number;
  /** 1-based column in the pasted grid. */
  column: number;
  /** The day column's heading, as written. */
  header: string;
  /** Ready-made position — `Row 4, "Tue"`. */
  label: string;
};

export type MatrixEntry =
  | { ok: true; origin: MatrixOrigin; cells: string[] }
  | { ok: false; origin: MatrixOrigin; diagnostics: ParseDiagnostic[] };

export type MatrixLayoutRead =
  | { kind: "matrix"; entries: MatrixEntry[] }
  | { kind: "not-matrix" }
  | { kind: "refused"; diagnostics: ParseDiagnostic[] };

/** The role a person holds, when the caller can resolve their name to one. */
export type MatrixRoleResolver = (staffName: string) => string | null;

export type MatrixLayoutOptions = {
  dateOrder: DateOrder;
  weekIsoDates: readonly string[];
  /**
   * Supplies the role for a cell that only wrote times.
   *
   * In a grid the person is named by their row, and the apply refuses any
   * assignment whose role that person does not hold — so their own role is the
   * only value the importer could ever accept, not a guess between several. A
   * cell that names a role explicitly always wins, so a genuine mismatch still
   * reaches the existing role check.
   */
  roleForStaffName: MatrixRoleResolver;
};

function originFor(rowIndex: number, day: DayColumn): MatrixOrigin {
  const heading = day.header.trim() || day.isoDate;
  return {
    row: rowIndex + 1,
    column: day.index + 1,
    header: day.header,
    label: `Row ${rowIndex + 1}, "${heading}"`,
  };
}

/**
 * Reads a delimited grid, or declines to.
 *
 * `not-matrix` is returned for anything that is not confidently a grid,
 * including every valid long-format file — see `readMatrixHeader`, which checks
 * that first and unconditionally.
 */
export function readMatrixLayout(
  rows: readonly (readonly string[])[],
  options: MatrixLayoutOptions,
): MatrixLayoutRead {
  const header = rows[0];
  if (!header || rows.length < 2) return { kind: "not-matrix" };

  const read = readMatrixHeader(header, options);
  if (read.kind !== "matrix") return read;

  const dayColumns = new Set(read.days.map((day) => day.index));
  const entries: MatrixEntry[] = [];

  for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex] ?? [];
    if (row.every((cell) => cell.trim() === "")) continue;

    // A row wider than its header has cells belonging to no column. Padding it
    // out would invent a day; dropping them would lose a shift.
    if (row.length > header.length) {
      return {
        kind: "refused",
        diagnostics: [
          errorDiagnostic(
            "ragged-row",
            `Row ${rowIndex + 1} has more cells than the grid has columns, so a shift there belongs to no day. Copy a complete rectangle and import again.`,
            { row: rowIndex + 1 },
          ),
        ],
      };
    }

    const stray = row.findIndex(
      (cell, index) => cell.trim() !== "" && index !== read.nameColumn && !dayColumns.has(index),
    );
    if (stray !== -1) {
      return {
        kind: "refused",
        diagnostics: [
          errorDiagnostic(
            "invalid-value",
            `Row ${rowIndex + 1} has "${(row[stray] ?? "").trim()}" in a column with no day heading, so it cannot be placed. Head that column with a weekday or a date, or remove it.`,
            { row: rowIndex + 1, column: stray + 1 },
          ),
        ],
      };
    }

    // A blank name is how a grid says "somebody, not yet decided" — the same
    // meaning a blank Staff cell already has in long format.
    const staffName = (row[read.nameColumn] ?? "").trim();

    for (const day of read.days) {
      const cell = (row[day.index] ?? "").trim();
      if (cell === "") continue;

      const origin = originFor(rowIndex, day);
      const parsed = readMatrixCell(cell);
      if (!parsed.ok) {
        entries.push({
          ok: false,
          origin,
          diagnostics: [
            errorDiagnostic("invalid-value", parsed.message, {
              row: origin.row,
              column: origin.column,
            }),
          ],
        });
        continue;
      }

      const role = parsed.role || (staffName ? (options.roleForStaffName(staffName) ?? "") : "");
      entries.push({
        ok: true,
        origin,
        cells: [day.isoDate, staffName, role, parsed.start, parsed.end],
      });
    }
  }

  if (entries.length === 0) {
    return {
      kind: "refused",
      diagnostics: [
        errorDiagnostic(
          "no-content",
          "This grid has staff and days but no shifts in it, so there is nothing to import.",
        ),
      ],
    };
  }

  return { kind: "matrix", entries };
}

/**
 * Re-points diagnostics at the cell they actually came from.
 *
 * The long-format parser positions its findings against the synthesised table
 * it was handed, which the manager never saw. The field name goes with them for
 * the same reason: there is no "start column" in a grid.
 */
export function attributeToOrigin(
  diagnostics: readonly ParseDiagnostic[],
  origin: MatrixOrigin,
): ParseDiagnostic[] {
  return diagnostics.map(({ field: _field, ...entry }) => ({
    ...entry,
    row: origin.row,
    column: origin.column,
  }));
}
