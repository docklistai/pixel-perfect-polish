import { errorDiagnostic, warningDiagnostic, type ParseDiagnostic } from "./parseDiagnostics";

/**
 * Reading a header row into a field map.
 *
 * Aliases are matched on a normalized header, never on position, so a manager's
 * own column order and capitalisation are irrelevant. A header that matches
 * nothing is ignored — but never silently: the manager is told which columns
 * were not used, because a mistyped "Strat" heading looks identical to a missing
 * start time until somebody says so.
 */

/** Header aliases, normalized to lower case with punctuation collapsed. */
const COLUMN_ALIASES: Record<string, string[]> = {
  date: ["date", "day", "shift date", "work date"],
  staff: ["staff", "name", "staff name", "employee", "person", "assigned to"],
  role: ["role", "job", "position", "role name"],
  start: ["start", "from", "start time", "starts"],
  end: ["end", "to", "end time", "ends", "finish"],
  department: ["department", "dept", "area", "team"],
  breakMinutes: ["break", "break minutes", "breaks", "unpaid break"],
  overnight: ["overnight", "crosses midnight", "next day"],
};

export const REQUIRED_COLUMNS = ["date", "role", "start", "end"] as const;

export type MappedColumn = { header: string; mappedTo: string | null };

export type ColumnMapping = {
  columns: MappedColumn[];
  /** Field name → source column index. First match wins on a duplicate header. */
  mapped: Map<string, number>;
};

function normaliseHeader(value: string): string {
  return value
    .replace(/[ \t\r\n\f\v]+/g, " ")
    .replace(/^ +| +$/g, "")
    .toLowerCase();
}

export function mapColumns(header: readonly string[]): ColumnMapping {
  const mapped = new Map<string, number>();
  const columns = header.map((raw) => {
    const key = normaliseHeader(raw);
    const field =
      Object.entries(COLUMN_ALIASES).find(([, aliases]) => aliases.includes(key))?.[0] ?? null;
    return { header: raw, mappedTo: field };
  });
  columns.forEach((column, index) => {
    if (column.mappedTo && !mapped.has(column.mappedTo)) mapped.set(column.mappedTo, index);
  });
  return { columns, mapped };
}

/** Errors for absent required columns, warnings for headers nothing understood. */
export function describeColumnMapping(mapping: ColumnMapping): ParseDiagnostic[] {
  const diagnostics: ParseDiagnostic[] = [];
  for (const required of REQUIRED_COLUMNS) {
    if (!mapping.mapped.has(required)) {
      diagnostics.push(
        errorDiagnostic(
          "missing-required-column",
          `This file has no ${required} column. Add one and import again.`,
        ),
      );
    }
  }
  for (const column of mapping.columns) {
    if (column.mappedTo === null && column.header.trim() !== "") {
      diagnostics.push(
        warningDiagnostic(
          "unknown-column",
          `Column "${column.header.trim()}" is not used by this import.`,
          { field: column.header },
        ),
      );
    }
  }
  return diagnostics;
}

/** Reads one field out of a source row, or "" when the column is absent. */
export function cellReader(mapping: ColumnMapping) {
  return (row: readonly string[], field: string): string => {
    const index = mapping.mapped.get(field);
    return index === undefined ? "" : (row[index] ?? "");
  };
}
