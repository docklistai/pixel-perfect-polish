import { warningDiagnostic, type ParseDiagnostic } from "./parseDiagnostics";
import { signatureKey } from "@/features/rota/lib/scheduling/shiftSignature";
import { absenceDiagnosticForImportedRow } from "./importAvailability";
import { parseHeadedRow } from "./headedRowParser";
import { buildCanonicalRoleResolver } from "./canonicalRoleNames";
import { attributeToOrigin, type MatrixOrigin } from "./matrixLayout";
import type { ColumnMapping } from "./headedColumnMap";
import type { HeadedImportOptions, ImportedShiftRow } from "./headedImportTypes";

/**
 * Walking the rows of an import, whichever shape it arrived in.
 *
 * Both layouts converge here: a long-format file hands over its own rows, and a
 * grid hands over the rows it was rearranged into. From this point there is one
 * parser, one duplicate rule and one role-spelling rule — which is the whole
 * reason the grid is transposed *before* this rather than parsed separately.
 *
 * A row can be refused; it can never disappear. Every source row is returned,
 * carrying either a shift or the reasons it has none.
 */

export type RowSource = {
  /** 1-based position in the table being parsed, excluding its header. */
  rowNumber: number;
  rawRow: readonly string[];
  /** Field name → written text, for the preview. */
  cells: Record<string, string>;
  /** The grid cell this came from, when the input was a matrix. */
  origin?: MatrixOrigin;
  /** Already refused before parsing — a grid cell that held no readable shift. */
  refusal?: ParseDiagnostic[];
};

export type RowAnalysis = {
  rows: ImportedShiftRow[];
  duplicatesInFile: number;
  duplicatesOfExisting: number;
};

function positioned(row: RowSource, diagnostics: readonly ParseDiagnostic[]): ParseDiagnostic[] {
  return row.origin ? attributeToOrigin(diagnostics, row.origin) : [...diagnostics];
}

function withSource(row: RowSource, partial: Omit<ImportedShiftRow, "row" | "cells">) {
  return {
    row: row.rowNumber,
    cells: row.cells,
    ...partial,
    ...(row.origin ? { source: row.origin } : {}),
  };
}

export function analyseRows(
  sources: readonly RowSource[],
  mapping: ColumnMapping,
  options: HeadedImportOptions,
): RowAnalysis {
  const weekDates = new Set(options.weekIsoDates);
  const seenInFile = new Map<string, RowSource>();
  const canonicalRoleName = buildCanonicalRoleResolver(options.knownRoleNames);
  // The row carries the id it resolved to; absence is explained by name, because
  // that is what the manager wrote and what they will go looking for in Leave.
  const staffNameById = new Map(options.staff.map((member) => [member.id, member.name]));
  const staffNameFor = (staffId: string | null) =>
    (staffId === null ? undefined : staffNameById.get(staffId)) ?? "This staff member";
  const rows: ImportedShiftRow[] = [];
  let duplicatesInFile = 0;
  let duplicatesOfExisting = 0;

  for (const source of sources) {
    if (source.refusal) {
      rows.push(withSource(source, { ok: false, diagnostics: [...source.refusal] }));
      continue;
    }

    const outcome = parseHeadedRow({
      rawRow: source.rawRow,
      rowNumber: source.rowNumber,
      mapping,
      options,
      weekDates,
    });
    if (!outcome.ok) {
      rows.push(
        withSource(source, { ok: false, diagnostics: positioned(source, outcome.diagnostics) }),
      );
      continue;
    }

    const diagnostics = positioned(source, outcome.diagnostics);

    // Recorded absence, before the duplicate rules. A row blocked here is never
    // written, so letting it register as "the first one seen" would attribute a
    // duplicate warning to a shift that does not exist — the same reason a row
    // that failed to parse never reaches the block below.
    const absence = options.availability
      ? absenceDiagnosticForImportedRow({
          staffId: outcome.shift.staffId,
          staffName: staffNameFor(outcome.shift.staffId),
          signature: outcome.shift.signature,
          availability: options.availability,
          position: source.origin
            ? { row: source.origin.row, column: source.origin.column }
            : { row: source.rowNumber },
        })
      : null;
    if (absence?.severity === "error") {
      rows.push(withSource(source, { ok: false, diagnostics: [...diagnostics, absence] }));
      continue;
    }
    if (absence) diagnostics.push(absence);

    const key = signatureKey(outcome.shift.signature);
    const firstSeen = seenInFile.get(key);
    if (firstSeen !== undefined) {
      duplicatesInFile += 1;
      diagnostics.push(
        warningDiagnostic(
          "duplicate-in-input",
          `The same shift is also at ${firstSeen.origin?.label ?? `row ${firstSeen.rowNumber}`}. Both will be imported — identical shifts are allowed.`,
          source.origin
            ? { row: source.origin.row, column: source.origin.column }
            : { row: source.rowNumber },
        ),
      );
    } else seenInFile.set(key, source);

    if (options.existingSignatureKeys?.has(key)) {
      duplicatesOfExisting += 1;
      diagnostics.push(
        warningDiagnostic(
          "duplicate-of-existing",
          "This week already has a shift exactly like this one. Importing adds another.",
          source.origin
            ? { row: source.origin.row, column: source.origin.column }
            : { row: source.rowNumber },
        ),
      );
    }

    // One spelling per role across the whole import. Only the display label
    // changes; the signature's normalized key — and so every identity and
    // duplicate decision already made above — is untouched.
    const shift = { ...outcome.shift, roleName: canonicalRoleName(outcome.shift.roleName) };
    rows.push(withSource(source, { ok: true, diagnostics, shift }));
  }

  return { rows, duplicatesInFile, duplicatesOfExisting };
}
