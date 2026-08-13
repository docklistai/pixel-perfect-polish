import type { ReportsCoverageRow } from "../types";

const HEADERS = [
  "Date",
  "Location",
  "Department",
  "Assigned shifts",
  "Open shifts",
  "Net scheduled hours",
  "Open hours",
] as const;

function safeCell(value: string | number): string {
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function buildCoverageCsv(rows: ReportsCoverageRow[]): string {
  const lines = [HEADERS.map(safeCell).join(",")];
  for (const row of rows) {
    lines.push(
      [
        row.date,
        row.location,
        row.department,
        row.assignedShifts,
        row.openShifts,
        (row.scheduledMinutes / 60).toFixed(2),
        (row.openMinutes / 60).toFixed(2),
      ]
        .map(safeCell)
        .join(","),
    );
  }
  return lines.join("\r\n");
}

export function downloadCoverageCsv(
  rows: ReportsCoverageRow[],
  startDate: string,
  endDate: string,
) {
  const blob = new Blob([`\uFEFF${buildCoverageCsv(rows)}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `published-schedule-coverage_${startDate}_${endDate}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}
