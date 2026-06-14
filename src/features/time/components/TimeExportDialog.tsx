import * as React from "react";
import { DialogShell, ActionButton, StatusBadge } from "@/components/dl";
import { Download, Info } from "lucide-react";
import { toast } from "sonner";
import type { StoredTimesheetRow } from "../types";
import { exportApprovedHoursFn } from "../api/timeLiveData";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rows: StoredTimesheetRow[];
  periodLabel: string;
  /** When set, the download uses the server-authoritative, audited export RPC. */
  liveWorkspaceId?: string | null;
  periodStart?: string;
  periodEnd?: string;
}

function csvCell(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

function triggerCsvDownload(content: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "harbour_view_approved_hours_8-14-jun.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export function TimeExportDialog({
  open,
  onOpenChange,
  rows,
  periodLabel,
  liveWorkspaceId,
  periodStart,
  periodEnd,
}: Props) {
  const approvedRows = rows.filter((row) => row.status === "approved");

  const handleDownload = async () => {
    // Live: the audited, CSV-injection-safe RPC is the authoritative source.
    if (liveWorkspaceId && periodStart && periodEnd) {
      const result = await exportApprovedHoursFn({
        data: { workspaceId: liveWorkspaceId, startDate: periodStart, endDate: periodEnd },
      });
      if (!result.ok) {
        toast.error("Couldn't export", { description: result.message });
        return;
      }
      const content = [
        ["Employee ID", "Name", "Approved Hours", "Role", "Department"],
        ...result.rows.map((row) => [
          row.staffMemberId,
          row.displayName,
          row.approvedHours.toFixed(2),
          row.roleName,
          row.departmentName,
        ]),
      ]
        .map((line) => line.map(csvCell).join(","))
        .join("\n");
      triggerCsvDownload(content);
      onOpenChange(false);
      toast.success("CSV ready", {
        description: `${result.rows.length} approved staff exported for ${periodLabel}.`,
      });
      return;
    }

    const content = [
      ["Employee ID", "Name", "Approved Hours", "Role", "Department"],
      ...approvedRows.map((row) => [row.id, row.n, row.paid, row.role, row.department]),
    ]
      .map((line) => line.map(csvCell).join(","))
      .join("\n");
    triggerCsvDownload(content);
    onOpenChange(false);
    toast.success("CSV ready", {
      description: `${approvedRows.length} approved rows exported for ${periodLabel}.`,
    });
  };

  return (
    <DialogShell
      open={open}
      onOpenChange={onOpenChange}
      title="Export approved hours (CSV)"
      description="Preview the file before downloading"
      icon={Download}
      iconTone="brand"
      footer={
        <>
          <ActionButton variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </ActionButton>
          <ActionButton size="sm" onClick={handleDownload}>
            <Download className="mr-1.5 h-3.5 w-3.5" /> Download CSV
          </ActionButton>
        </>
      }
    >
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label: "Rows", value: `${approvedRows.length} rows` },
          { label: "Period", value: periodLabel },
          { label: "Format", value: "CSV · standard" },
        ].map((stat, idx) => (
          <div key={idx} className="rounded-2xl border border-border bg-muted/20 p-3 text-left">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {stat.label}
            </div>
            <div className="mt-1 text-xs font-bold text-foreground">{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-muted/10">
        <div className="overflow-x-auto max-h-48">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/20 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <th className="px-3 py-2">Employee ID</th>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Approved Hours</th>
                <th className="px-3 py-2">Role</th>
              </tr>
            </thead>
            <tbody>
              {approvedRows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-border/40 last:border-0 hover:bg-muted/10"
                >
                  <td className="px-3 py-2 font-mono text-muted-foreground">{row.id}</td>
                  <td className="px-3 py-2 font-medium">{row.n}</td>
                  <td className="px-3 py-2 font-mono">{row.paid}</td>
                  <td className="px-3 py-2">{row.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 flex gap-2.5 rounded-xl bg-muted/10 p-2.5 text-[11px] text-muted-foreground">
        <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
        <span>
          Only approved entries are included. This export contains approved hours and staff roles.
        </span>
      </div>
    </DialogShell>
  );
}
