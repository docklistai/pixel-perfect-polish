import { errorDiagnostic, type ParseDiagnostic } from "./parseDiagnostics";
import type { DateOrder } from "./explicitDateFormat";
import { mapColumns, REQUIRED_COLUMNS } from "./headedColumnMap";
import { classifyHeader, type ClassifiedHeader } from "./matrixHeaderVocabulary";
import { isoWeekday } from "@/features/rota/lib/recurringDayOffClashes";

/**
 * Deciding whether a pasted grid is a staff × day rota, and which day is which.
 *
 * This is the whole risk of matrix import in one file. Reading a grid wrongly
 * does not produce an error a manager can see — it produces a rota where
 * everybody works the wrong days. So every rule here either identifies a column
 * beyond doubt or refuses the file, and there is no third outcome that guesses.
 *
 * Three verdicts, and the difference matters:
 *
 * - `not-matrix`  — this is simply not a grid. The long-format parser gets the
 *                   input unchanged; nothing has been decided about it.
 * - `refused`     — this looks like a grid but cannot be read safely.
 * - `matrix`      — every column is accounted for and every day is resolved.
 */

export type DayColumn = { index: number; header: string; isoDate: string };

export type MatrixHeaderRead =
  | { kind: "matrix"; nameColumn: number; days: DayColumn[] }
  | { kind: "not-matrix" }
  | { kind: "refused"; diagnostics: ParseDiagnostic[] };

function refuse(message: string, column?: number): MatrixHeaderRead {
  return {
    kind: "refused",
    diagnostics: [
      errorDiagnostic("invalid-value", message, { row: 1, ...(column ? { column } : {}) }),
    ],
  };
}

/**
 * Reads the header row of a possible matrix.
 *
 * `weekIsoDates` is the target week, so a weekday heading resolves to a real
 * date rather than to a day number — "Tue" means this week's Tuesday, and a
 * grid for another week is refused rather than silently re-dated.
 */
export function readMatrixHeader(
  header: readonly string[],
  options: { dateOrder: DateOrder; weekIsoDates: readonly string[] },
): MatrixHeaderRead {
  // A file the long-format parser can already read is never a matrix. This is
  // checked first and unconditionally: a valid import must never change meaning
  // because a new layout was added underneath it.
  const longFormat = mapColumns(header);
  if (REQUIRED_COLUMNS.every((column) => longFormat.mapped.has(column)))
    return { kind: "not-matrix" };

  if (header.length < 3) return { kind: "not-matrix" };

  const weekByWeekday = new Map(options.weekIsoDates.map((date) => [isoWeekday(date), date]));
  const classified = header.map((cell) => classifyHeader(cell, options.dateOrder, weekByWeekday));

  const days: DayColumn[] = [];
  const kinds = new Set<"date" | "weekday">();
  classified.forEach((entry, index) => {
    if (entry.kind !== "day") return;
    days.push({ index, header: header[index] ?? "", isoDate: entry.isoDate });
    kinds.add(entry.by);
  });

  // Two or more day-ish headings is unmistakably an attempt at a grid, even when
  // some of them are unreadable — counting only the readable ones would let a
  // grid headed entirely "Mon 03/08" fall through and be reported as a
  // long-format file with no date column, which explains nothing.
  const dayish =
    days.length + classified.filter((entry) => entry.kind === "weekday-with-extra").length;
  if (dayish < 2) return { kind: "not-matrix" };

  const extra = classified.findIndex((entry) => entry.kind === "weekday-with-extra");
  if (extra !== -1) {
    return refuse(
      `The column headed "${(header[extra] ?? "").trim()}" names a weekday and something else, and the two can disagree. Head each day column with either the weekday on its own, such as Tue, or a full date such as 25/08/2026.`,
      extra + 1,
    );
  }

  if (kinds.size > 1) {
    return refuse(
      "Some day columns are headed with a weekday and others with a date. Use one or the other for the whole grid, so every column is read the same way.",
    );
  }

  const duplicate = days.find(
    (day, index) => days.findIndex((other) => other.isoDate === day.isoDate) !== index,
  );
  if (duplicate) {
    return refuse(
      `Two columns both mean ${duplicate.isoDate}, so a shift could belong to either. Give each day exactly one column.`,
      duplicate.index + 1,
    );
  }

  const outOfWeek = days.find((day) => !options.weekIsoDates.includes(day.isoDate));
  if (outOfWeek) {
    return refuse(
      `The column headed "${outOfWeek.header.trim()}" is ${outOfWeek.isoDate}, which is not in the week you are importing into. Import one week at a time.`,
      outOfWeek.index + 1,
    );
  }

  const nameColumn = resolveNameColumn(classified, days, header);
  if (typeof nameColumn !== "number") return nameColumn;

  return { kind: "matrix", nameColumn, days };
}

/**
 * Which column names the people.
 *
 * Exactly one, and to the left of every day. A blank top-left cell counts,
 * because that is what a spreadsheet looks like when the corner was never
 * labelled — but only when the day columns have already been found, so a blank
 * first header in an ordinary file cannot pull it into this path.
 */
function resolveNameColumn(
  classified: readonly ClassifiedHeader[],
  days: readonly DayColumn[],
  header: readonly string[],
): number | MatrixHeaderRead {
  const named = classified.flatMap((entry, index) => (entry.kind === "name" ? [index] : []));
  if (named.length > 1) {
    return refuse(
      `More than one column could be the staff names (${named.map((index) => `"${(header[index] ?? "").trim()}"`).join(", ")}), so this grid was not read. Leave one column naming the people.`,
    );
  }

  const firstDay = Math.min(...days.map((day) => day.index));
  const candidate = named[0] ?? (classified[0]?.kind === "blank" ? 0 : undefined);

  if (candidate === undefined) {
    return refuse(
      "This looks like a grid of days, but no column names the people. Head the first column Staff or Name.",
    );
  }
  if (candidate > firstDay) {
    return refuse(
      "The staff names must be in a column to the left of the days. Move that column to the front and import again.",
    );
  }

  // Anything that is neither the names nor a day sits in the middle of the shift
  // cells. Ignoring it could drop real shifts, so it is refused by name.
  const stray = classified.findIndex(
    (entry, index) =>
      index !== candidate && entry.kind !== "day" && !(entry.kind === "blank" && index > firstDay),
  );
  if (stray !== -1) {
    return refuse(
      `The column headed "${(header[stray] ?? "").trim()}" is neither the staff names nor a day, so this grid was not read. Remove it, or head it with a weekday such as Tue or a full date such as 25/08/2026.`,
      stray + 1,
    );
  }

  return candidate;
}
