import { readDelimited } from "./delimitedReader";
import { errorDiagnostic, type ParseDiagnostic } from "./parseDiagnostics";
import { MAX_PROPOSAL_OPERATIONS } from "@/features/rota/lib/scheduling/buildWeekProposal";
import {
  cellReader,
  describeColumnMapping,
  mapColumns,
  type ColumnMapping,
} from "./headedColumnMap";
import { analyseRows, type RowSource } from "./headedRowAnalysis";
import { MATRIX_HEADER, readMatrixLayout } from "./matrixLayout";
import { resolveStaffByName } from "./exactResolvers";
import type {
  HeadedImportOptions,
  HeadedScheduleImportResult,
  ImportedShiftRow,
} from "./headedImportTypes";

export type {
  HeadedImportOptions,
  HeadedScheduleImportResult,
  ImportedShift,
  ImportedShiftRow,
} from "./headedImportTypes";

/**
 * Schedule import, from either shape a manager's rota comes in.
 *
 * Two layouts arrive here and exactly one parser reads them. A **long** file
 * lists shifts a row at a time. A **matrix** is the grid a small venue actually
 * keeps — people down the side, days across the top — and is rearranged into
 * long rows before anything else looks at it. Which one this is, is decided by
 * `readMatrixLayout`, and it declines anything that is not unmistakably a grid;
 * a valid long-format file can never be re-read as one.
 *
 * This produces a **preview only**. Nothing is written, every source row appears
 * in the result whether or not it could be read, and anything that will not be
 * imported carries a diagnostic saying why. A row can be rejected; it can never
 * quietly vanish.
 *
 * This file owns the file-level shape: read it, work out its layout, then
 * analyse the paste as a whole — duplicates, role spelling, and whether it is
 * small enough to apply at all. Reading one row is `headedRowParser`,
 * understanding a long header is `headedColumnMap`, and understanding a grid is
 * `matrixHeaders`.
 */

const EMPTY = {
  columns: [] as { header: string; mappedTo: string | null }[],
  rows: [] as ImportedShiftRow[],
  layout: "long" as const,
  validCount: 0,
  errorCount: 0,
  duplicatesInFile: 0,
  duplicatesOfExisting: 0,
  operationCount: 0,
  operationLimit: MAX_PROPOSAL_OPERATIONS,
};

function failed(
  diagnostics: ParseDiagnostic[],
  columns = EMPTY.columns,
): HeadedScheduleImportResult {
  return { ok: false, diagnostics, ...EMPTY, columns };
}

/** Long-format rows, read through the header the manager wrote. */
function longSources(
  dataRows: readonly (readonly string[])[],
  mapping: ColumnMapping,
): RowSource[] {
  const cellAt = cellReader(mapping);
  const sources: RowSource[] = [];
  dataRows.forEach((rawRow, index) => {
    if (rawRow.every((cell) => cell.trim() === "")) return;
    const cells: Record<string, string> = {};
    for (const field of mapping.mapped.keys()) cells[field] = cellAt(rawRow, field);
    sources.push({ rowNumber: index + 1, rawRow, cells });
  });
  return sources;
}

/** Grid cells, already rearranged, described in the same terms. */
function matrixSources(entries: ReturnType<typeof readMatrixLayout>): RowSource[] {
  if (entries.kind !== "matrix") return [];
  return entries.entries.map((entry, index) => {
    const rowNumber = index + 1;
    if (!entry.ok) {
      return {
        rowNumber,
        rawRow: [],
        cells: { staff: "", date: "", role: "", start: "", end: "" },
        origin: entry.origin,
        refusal: entry.diagnostics,
      };
    }
    const cells: Record<string, string> = {};
    MATRIX_HEADER.forEach((header, column) => {
      cells[header.toLowerCase()] = entry.cells[column] ?? "";
    });
    return { rowNumber, rawRow: entry.cells, cells, origin: entry.origin };
  });
}

export function importHeadedSchedule(
  text: string,
  options: HeadedImportOptions,
): HeadedScheduleImportResult {
  const read = readDelimited(text, { allowRagged: true });
  if (!read.ok) return failed(read.diagnostics);

  const [headerRow, ...dataRows] = read.rows;
  if (!headerRow || dataRows.length === 0) {
    return failed([
      errorDiagnostic("no-content", "This file needs a header row and at least one shift."),
    ]);
  }

  // A grid is recognised before the header is mapped, because a grid's header
  // is days rather than fields and mapping it would only ever fail.
  const matrix = readMatrixLayout(read.rows, {
    dateOrder: options.dateOrder,
    weekIsoDates: options.weekIsoDates,
    roleForStaffName: (name) => {
      const resolved = resolveStaffByName(name, options.staff);
      return resolved.kind === "resolved" ? (resolved.value.roleName ?? null) : null;
    },
  });
  if (matrix.kind === "refused") return failed(matrix.diagnostics);

  const isMatrix = matrix.kind === "matrix";
  const mapping = mapColumns(isMatrix ? [...MATRIX_HEADER] : headerRow);
  const fileDiagnostics = isMatrix ? [] : describeColumnMapping(mapping);
  if (fileDiagnostics.some((entry) => entry.severity === "error")) {
    // The column mapping is kept even on failure: the manager needs to see which
    // headers were understood to work out what is missing.
    return failed(fileDiagnostics, mapping.columns);
  }

  const analysis = analyseRows(
    isMatrix ? matrixSources(matrix) : longSources(dataRows, mapping),
    mapping,
    options,
  );

  const validCount = analysis.rows.filter((row) => row.ok).length;
  const diagnostics = [...fileDiagnostics];

  // One valid row is one operation. The ceiling is checked here, before the
  // preview is ever marked ready, because the apply RPC refuses a longer list
  // outright — a preview saying "600 ready" would be promising a write that
  // could never happen.
  const overLimit = validCount > MAX_PROPOSAL_OPERATIONS;
  if (overLimit) {
    diagnostics.push(
      errorDiagnostic(
        "too-many-operations",
        `This ${isMatrix ? "grid" : "paste"} would create ${validCount} shifts, and an import writes at most ${MAX_PROPOSAL_OPERATIONS} at once. Split it into smaller imports and apply them one after another.`,
      ),
    );
  }

  return {
    ok: validCount > 0 && !overLimit,
    diagnostics,
    columns: isMatrix ? headerRow.map((header) => ({ header, mappedTo: null })) : mapping.columns,
    layout: isMatrix ? "matrix" : "long",
    rows: analysis.rows,
    validCount,
    errorCount: analysis.rows.length - validCount,
    duplicatesInFile: analysis.duplicatesInFile,
    duplicatesOfExisting: analysis.duplicatesOfExisting,
    operationCount: validCount,
    operationLimit: MAX_PROPOSAL_OPERATIONS,
  };
}
