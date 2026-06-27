import type { StoredTimesheetRow } from "../types";

export function approvedRowsForExport(rows: StoredTimesheetRow[]): StoredTimesheetRow[] {
  return rows.filter((row) => row.status === "approved");
}

export function canExportApprovedHours(rows: StoredTimesheetRow[]): boolean {
  return approvedRowsForExport(rows).length > 0;
}
