import { readDelimited } from "./delimitedReader";
import { errorDiagnostic, warningDiagnostic } from "./parseDiagnostics";
import { signatureKey } from "@/features/rota/lib/scheduling/shiftSignature";
import { describeColumnMapping, mapColumns } from "./headedColumnMap";
import { parseHeadedRow } from "./headedRowParser";
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
 * Headed CSV/TSV schedule import.
 *
 * The one genuinely new parser in this subsystem, and the only place a rota date
 * arrives as text — everywhere else a date comes from the grid column a shift
 * sits in, which is why ambiguity cannot arise there and must be handled here.
 *
 * This produces a **preview only**. Nothing is written, every source row appears
 * in the result whether or not it could be read, and anything that will not be
 * imported carries a diagnostic saying why. A row can be rejected; it can never
 * quietly vanish.
 *
 * This file owns the file-level shape: read, map the header, walk the rows, then
 * analyse duplicates across the whole paste. Reading one row is
 * `headedRowParser`; understanding the header is `headedColumnMap`.
 */
export function importHeadedSchedule(
  text: string,
  options: HeadedImportOptions,
): HeadedScheduleImportResult {
  const empty = {
    columns: [] as { header: string; mappedTo: string | null }[],
    rows: [] as ImportedShiftRow[],
    validCount: 0,
    errorCount: 0,
    duplicatesInFile: 0,
    duplicatesOfExisting: 0,
  };

  const read = readDelimited(text, { allowRagged: true });
  if (!read.ok) return { ok: false, diagnostics: read.diagnostics, ...empty };

  const [headerRow, ...dataRows] = read.rows;
  if (!headerRow || dataRows.length === 0) {
    return {
      ok: false,
      diagnostics: [
        errorDiagnostic("no-content", "This file needs a header row and at least one shift."),
      ],
      ...empty,
    };
  }

  const mapping = mapColumns(headerRow);
  const fileDiagnostics = describeColumnMapping(mapping);
  if (fileDiagnostics.some((entry) => entry.severity === "error")) {
    // The column mapping is kept even on failure: the manager needs to see which
    // headers were understood to work out what is missing.
    return { ok: false, diagnostics: fileDiagnostics, ...empty, columns: mapping.columns };
  }

  const weekDates = new Set(options.weekIsoDates);
  const seenInFile = new Map<string, number>();
  const rows: ImportedShiftRow[] = [];
  let duplicatesInFile = 0;
  let duplicatesOfExisting = 0;

  dataRows.forEach((rawRow, index) => {
    const rowNumber = index + 1;
    if (rawRow.every((cell) => cell.trim() === "")) return;

    const cells: Record<string, string> = {};
    for (const [field, columnIndex] of mapping.mapped) cells[field] = rawRow[columnIndex] ?? "";

    const outcome = parseHeadedRow({ rawRow, rowNumber, mapping, options, weekDates });
    if (!outcome.ok) {
      rows.push({ row: rowNumber, cells, ok: false, diagnostics: outcome.diagnostics });
      return;
    }

    const diagnostics = [...outcome.diagnostics];
    const key = signatureKey(outcome.shift.signature);
    const firstSeen = seenInFile.get(key);
    if (firstSeen !== undefined) {
      duplicatesInFile += 1;
      diagnostics.push(
        warningDiagnostic(
          "duplicate-in-input",
          `The same shift is also on row ${firstSeen}. Both will be imported — identical shifts are allowed.`,
          { row: rowNumber },
        ),
      );
    } else seenInFile.set(key, rowNumber);

    if (options.existingSignatureKeys?.has(key)) {
      duplicatesOfExisting += 1;
      diagnostics.push(
        warningDiagnostic(
          "duplicate-of-existing",
          "This week already has a shift exactly like this one. Importing adds another.",
          { row: rowNumber },
        ),
      );
    }

    rows.push({ row: rowNumber, cells, ok: true, diagnostics, shift: outcome.shift });
  });

  const validCount = rows.filter((row) => row.ok).length;
  return {
    ok: validCount > 0,
    diagnostics: fileDiagnostics,
    columns: mapping.columns,
    rows,
    validCount,
    errorCount: rows.length - validCount,
    duplicatesInFile,
    duplicatesOfExisting,
  };
}
