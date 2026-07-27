import type { StoredTimesheetRow } from "../types";

export function approvedRowsForExport(rows: StoredTimesheetRow[]): StoredTimesheetRow[] {
  return rows.filter((row) => row.status === "approved");
}

export function canExportApprovedHours(rows: StoredTimesheetRow[]): boolean {
  return approvedRowsForExport(rows).length > 0;
}

export interface ApprovedHoursCsvRow {
  id: string;
  name: string;
  approvedHours: string;
  role: string;
  department: string;
}

/**
 * The first column is the `staff_members` row id, not a payroll or HR employee
 * number. It was labelled "Employee ID", which invited a payroll system to
 * treat it as one; "Staff record ID" says what it actually is.
 */
export const APPROVED_HOURS_CSV_HEADER = [
  "Staff record ID",
  "Name",
  "Approved Hours",
  "Role",
  "Department",
] as const;

function csvCell(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

export function buildApprovedHoursCsv(rows: ApprovedHoursCsvRow[]): string {
  return [
    [...APPROVED_HOURS_CSV_HEADER],
    ...rows.map((row) => [row.id, row.name, row.approvedHours, row.role, row.department]),
  ]
    .map((line) => line.map(csvCell).join(","))
    .join("\n");
}
