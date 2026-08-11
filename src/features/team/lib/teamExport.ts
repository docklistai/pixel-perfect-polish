import type { TeamRosterRow } from "../types";

const COLUMNS = [
  ["displayName", "Name"],
  ["roleName", "Role"],
  ["departmentName", "Department"],
  ["status", "Status"],
  ["deliveredAt", "Delivered"],
  ["readAt", "Read"],
  ["acknowledgedAt", "Acknowledged"],
] as const;

/** Quotes every cell and neutralises spreadsheet formula injection. */
function cell(value: unknown): string {
  const raw = value == null ? "" : String(value);
  const safe = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replaceAll('"', '""')}"`;
}

export function rosterToCsv(rows: TeamRosterRow[]): string {
  return [
    COLUMNS.map(([, header]) => cell(header)).join(","),
    ...rows.map((row) => COLUMNS.map(([key]) => cell(row[key])).join(",")),
  ].join("\r\n");
}

export function rosterFilename(title: string, now: Date = new Date()): string {
  const slug =
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "announcement";
  return `docklist-team-${slug}-${now.toISOString().slice(0, 10)}.csv`;
}

export function downloadRosterCsv(rows: TeamRosterRow[], title: string): void {
  const blob = new Blob([rosterToCsv(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = rosterFilename(title);
  link.click();
  URL.revokeObjectURL(url);
}
