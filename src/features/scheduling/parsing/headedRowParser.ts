import { errorDiagnostic, type ParseDiagnostic } from "./parseDiagnostics";
import { readDate } from "./explicitDateFormat";
import { buildShiftSignature } from "@/features/rota/lib/scheduling/shiftSignature";
import { cellReader, type ColumnMapping } from "./headedColumnMap";
import { checkStaffRole, readBreakMinutes, readDepartment, readStaff } from "./headedRowFields";
import { readTimes } from "./headedTimeField";
import type { HeadedImportOptions, ImportedShift } from "./headedImportTypes";

/**
 * One source row, read into a shift or into the reasons it could not be.
 *
 * Every field is read independently and *all* of its problems are collected,
 * rather than stopping at the first: a manager fixing a paste wants the whole
 * list of what is wrong with a row, not one item per attempt.
 *
 * Times are read through the shared scheduling vocabulary, so a row written
 * "9am"–"5pm" imports exactly as it would type into a rota cell. There is one
 * definition of what a written time means, not one per surface.
 */

export type RowParseOutcome =
  | { ok: true; shift: ImportedShift; diagnostics: ParseDiagnostic[] }
  | { ok: false; diagnostics: ParseDiagnostic[] };

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
  const warnings: ParseDiagnostic[] = [];

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

  const times = readTimes(cellAt(rawRow, "start"), cellAt(rawRow, "end"), rowNumber);
  if (!times.ok) diagnostics.push(...times.diagnostics);
  else warnings.push(...times.diagnostics);

  const roleName = cellAt(rawRow, "role").trim();
  if (!roleName) {
    diagnostics.push(
      errorDiagnostic("missing-required-value", "This row has no role.", {
        row: rowNumber,
        field: "role",
      }),
    );
  }

  const staff = readStaff(cellAt(rawRow, "staff"), options, rowNumber);
  if (staff.diagnostic) diagnostics.push(staff.diagnostic);
  if (staff.member && roleName) {
    const roleClash = checkStaffRole(staff.member, roleName, rowNumber);
    if (roleClash) diagnostics.push(roleClash);
  }

  const department = readDepartment(cellAt(rawRow, "department"), options, rowNumber);
  if (department.diagnostic) diagnostics.push(department.diagnostic);

  const breakRead = readBreakMinutes(
    cellAt(rawRow, "breakMinutes"),
    options.defaultBreakMinutes ?? 30,
    rowNumber,
  );
  if (breakRead.diagnostic) diagnostics.push(breakRead.diagnostic);

  if (diagnostics.length > 0 || !date.ok || !times.ok) {
    return { ok: false, diagnostics };
  }

  const signature = buildShiftSignature({
    workDate: date.isoDate,
    start: times.start,
    end: times.end,
    role: roleName,
    departmentId: department.id ?? options.defaultDepartmentId,
    locationId: options.locationId,
    breakMinutes: breakRead.minutes,
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
            `This row says overnight is "${overnightCell}", but ${times.start}–${times.end} ${signature.overnight ? "does" : "does not"} cross midnight.`,
            { row: rowNumber, field: "overnight" },
          ),
        ],
      };
    }
  }

  return {
    ok: true,
    shift: { signature, roleName, staffId: staff.member?.id ?? null },
    diagnostics: warnings,
  };
}
