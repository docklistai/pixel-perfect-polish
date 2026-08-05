function cell(value: unknown): string {
  const raw = value == null ? "" : String(value);
  const safe = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replaceAll('"', '""')}"`;
}

export function downloadOpsCsv(rows: Array<Record<string, unknown>>, exportedAt: string): void {
  const columns = [
    "id",
    "type",
    "title",
    "description",
    "location",
    "area",
    "department",
    "assignee",
    "dueAt",
    "priority",
    "status",
    "severity",
    "occurredAt",
    "immediateAction",
    "createdAt",
    "updatedAt",
  ];
  const csv = [
    columns.map(cell).join(","),
    ...rows.map((row) => columns.map((key) => cell(row[key])).join(",")),
  ].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `docklist-ops-${exportedAt.slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
