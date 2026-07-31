import { errorDiagnostic, type ParseDiagnostic } from "./parseDiagnostics";
import { readDate } from "./explicitDateFormat";
import { describeResolution, resolveDepartmentByName, resolveStaffByName } from "./exactResolvers";
import { buildShiftSignature } from "@/features/rota/lib/scheduling/shiftSignature";
import { parseLocalTimeToMinutes } from "@/features/rota/lib/scheduling/calendarInterval";
import { cellReader, type ColumnMapping } from "./headedColumnMap";
import type { HeadedImportOptions, ImportedShift } from "./headedImportTypes";

/**
 * One source row, read into a shift or into the reasons it could not be.
 *
 * Every field is read independently and *all* of its problems are collected,
 * rather than stopping at the first: a manager fixing a paste wants the whole
 * list of what is wrong with a row, not one item per attempt.
 *
 * A blank staff cell is a deliberate open shift, never a missing value. That
 * distinction is the difference between importing an unfilled shift and
 * refusing the row.
 */

export type RowParseOutcome =
  | { ok: true; shift: ImportedShift; diagnostics: ParseDiagnostic[] }
  | { ok: false; diagnostics: ParseDiagnostic[] };

function readTime(value: string, label: string, row: number): string | ParseDiagnostic {
  const trimmed = value.trim();
  const minutes = parseLocalTimeToMinutes(trimmed);
  if (minutes === null) {
    return errorDiagnostic("invalid-value", `"${trimmed}" is not a time like 09:00.`, {
      row,
      field: label,
    });
  }
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

export function parseHeadedRow({
  rawRow,
  rowNumber,
  mapping,
  options,
  weekDates,
}: {
  rawRow: readonly string[];
  rowNumber: number;
  mapping: ColumnMapping;
  options: HeadedImportOptions;
  weekDates: ReadonlySet<string>;
}): RowParseOutcome {
  const cellAt = cellReader(mapping);
  const diagnostics: ParseDiagnostic[] = [];

  const date = readDate(cellAt(rawRow, "date"), options.dateOrder);
  if (!date.ok) {
    diagnostics.push(
      errorDiagnostic(
        date.reason === "ambiguous" ? "ambiguous-date" : "invalid-value",
        date.message,
        { row: rowNumber, field: "date" },
      ),
    );
  } else if (!weekDates.has(date.isoDate)) {
    diagnostics.push(
      errorDiagnostic(
        "invalid-value",
        `${date.isoDate} is not in the week you are importing into.`,
        {
          row: rowNumber,
          field: "date",
        },
      ),
    );
  }

  const start = readTime(cellAt(rawRow, "start"), "start", rowNumber);
  if (typeof start !== "string") diagnostics.push(start);
  const end = readTime(cellAt(rawRow, "end"), "end", rowNumber);
  if (typeof end !== "string") diagnostics.push(end);

  const roleName = cellAt(rawRow, "role").trim();
  if (!roleName) {
    diagnostics.push(
      errorDiagnostic("missing-required-value", "This row has no role.", {
        row: rowNumber,
        field: "role",
      }),
    );
  }

  // A blank staff cell is a deliberate open shift, not a missing value.
  let staffId: string | null = null;
  const staffCell = cellAt(rawRow, "staff").trim();
  if (staffCell) {
    const resolved = resolveStaffByName(staffCell, options.staff);
    if (resolved.kind === "resolved") staffId = resolved.value.id;
    else {
      diagnostics.push(
        errorDiagnostic(
          resolved.kind === "ambiguous" ? "ambiguous-reference" : "unresolved-reference",
          describeResolution(resolved, "staff member", staffCell)!,
          { row: rowNumber, field: "staff" },
        ),
      );
    }
  }

  let departmentId = options.defaultDepartmentId;
  const departmentCell = cellAt(rawRow, "department").trim();
  if (departmentCell) {
    const resolved = resolveDepartmentByName(departmentCell, options.departments);
    if (resolved.kind === "resolved") departmentId = resolved.value.id;
    else {
      diagnostics.push(
        errorDiagnostic(
          resolved.kind === "ambiguous" ? "ambiguous-reference" : "unresolved-reference",
          describeResolution(resolved, "department", departmentCell)!,
          { row: rowNumber, field: "department" },
        ),
      );
    }
  }

  let breakMinutes = options.defaultBreakMinutes ?? 30;
  const breakCell = cellAt(rawRow, "breakMinutes").trim();
  if (breakCell) {
    const parsed = Number(breakCell);
    if (!Number.isInteger(parsed) || parsed < 0 || parsed > 1440) {
      diagnostics.push(
        errorDiagnostic("invalid-value", `"${breakCell}" is not a break length in minutes.`, {
          row: rowNumber,
          field: "break",
        }),
      );
    } else breakMinutes = parsed;
  }

  if (diagnostics.length > 0 || !date.ok || typeof start !== "string" || typeof end !== "string") {
    return { ok: false, diagnostics };
  }

  const signature = buildShiftSignature({
    workDate: date.isoDate,
    start,
    end,
    role: roleName,
    departmentId,
    locationId: options.locationId,
    breakMinutes,
  });

  // An explicit overnight column must agree with the times, rather than
  // overriding them — a disagreement means one of the two is wrong.
  const overnightCell = cellAt(rawRow, "overnight").trim().toLowerCase();
  if (overnightCell) {
    const stated = ["yes", "y", "true", "1"].includes(overnightCell);
    if (stated !== signature.overnight) {
      return {
        ok: false,
        diagnostics: [
          errorDiagnostic(
            "invalid-value",
            `This row says overnight is "${overnightCell}", but ${start}–${end} ${signature.overnight ? "does" : "does not"} cross midnight.`,
            { row: rowNumber, field: "overnight" },
          ),
        ],
      };
    }
  }

  return { ok: true, shift: { signature, roleName, staffId }, diagnostics };
}
