import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { Download, Info, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ActionButton, DialogShell } from "@/components/dl";
import { downloadApprovedHoursFn, previewApprovedHoursFn } from "../api/timeLiveData";
import { approvedRowsForExport, buildApprovedHoursCsv } from "../lib/timeExport";
import { periodFilename, type ReviewPeriod } from "../lib/reviewPeriod";
import type { StoredTimesheetRow } from "../types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rows: StoredTimesheetRow[];
  period: ReviewPeriod;
  source: "live" | "demo";
  departmentId?: string;
  departmentLabel: string;
}

interface PreviewRow {
  id: string;
  name: string;
  approvedHours: string;
  role: string;
  department: string;
}

const rootRouteApi = getRouteApi("__root__");

function triggerCsvDownload(content: string, filename: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function TimeExportDialog({
  open,
  onOpenChange,
  rows,
  period,
  source,
  departmentId,
  departmentLabel,
}: Props) {
  const isLive = source === "live";
  const { auth } = rootRouteApi.useRouteContext();
  const principalId = auth.status === "signed-out" ? null : auth.userId;
  const workspaceId = auth.status === "member" ? auth.workspaceId : null;
  // Preview only — this writes no audit event, so opening the dialog, letting
  // it refetch, or cancelling records nothing.
  const livePreview = useQuery({
    queryKey: [
      "approved-hours-export-preview",
      principalId,
      workspaceId,
      period.startIso,
      period.endIso,
      departmentId,
    ],
    queryFn: () =>
      previewApprovedHoursFn({
        data: {
          startDate: period.startIso,
          endDate: period.endIso,
          ...(departmentId ? { departmentId } : {}),
        },
      }),
    enabled: open && isLive && workspaceId !== null,
    staleTime: 0,
  });
  const [downloading, setDownloading] = React.useState(false);
  const [staleNotice, setStaleNotice] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) setStaleNotice(null);
  }, [open, period.startIso, period.endIso, departmentId]);

  const demoPreview: PreviewRow[] = approvedRowsForExport(rows).map((row) => ({
    id: row.id,
    name: row.n,
    approvedHours: row.paid,
    role: row.role,
    department: row.department,
  }));
  const liveResult = livePreview.data;
  const previewRows: PreviewRow[] =
    isLive && liveResult?.ok
      ? liveResult.rows.map((row) => ({
          id: row.staffMemberId,
          name: row.displayName,
          approvedHours: row.approvedHours.toFixed(2),
          role: row.roleName,
          department: row.departmentName,
        }))
      : isLive
        ? []
        : demoPreview;
  const previewError = isLive && liveResult && !liveResult.ok ? liveResult : null;
  const previewPending = isLive && livePreview.isPending;
  const nothingApproved = !previewPending && !previewError && previewRows.length === 0;

  const finishDownload = (rows: PreviewRow[]) => {
    triggerCsvDownload(buildApprovedHoursCsv(rows), periodFilename(period));
    onOpenChange(false);
    toast.success("CSV ready", {
      description: `${rows.length} approved staff exported for ${period.label}.`,
    });
  };

  const handleDownload = async () => {
    // Re-entry guard: the audit records one export per confirmed download, and
    // a second click while the first is in flight is not a second export.
    if (downloading) return;
    if (previewRows.length === 0) {
      toast.info("Nothing to export", {
        description: `No approved hours in ${period.label} yet.`,
      });
      return;
    }
    if (!isLive) {
      finishDownload(previewRows);
      return;
    }
    if (!liveResult?.ok) return;

    setDownloading(true);
    setStaleNotice(null);
    try {
      // This is the only call that writes an audit event, and only because the
      // manager pressed Download on the figures identified by this signature.
      const result = await downloadApprovedHoursFn({
        data: {
          startDate: period.startIso,
          endDate: period.endIso,
          ...(departmentId ? { departmentId } : {}),
          expectedSignature: liveResult.previewSignature,
        },
      });
      if (!result.ok) {
        if (result.staleSignature) {
          // Nothing audited, nothing downloaded. Show the refreshed figures and
          // make the manager confirm the export they can now actually see.
          setStaleNotice(result.message);
          await livePreview.refetch();
          return;
        }
        toast.error("Export failed", { description: result.message });
        return;
      }
      finishDownload(
        result.rows.map((row) => ({
          id: row.staffMemberId,
          name: row.displayName,
          approvedHours: row.approvedHours.toFixed(2),
          role: row.roleName,
          department: row.departmentName,
        })),
      );
    } catch {
      // A transport failure resolves nothing, so without this the button would
      // simply re-enable and the manager would be left guessing.
      toast.error("Export failed", {
        description: "The download could not be completed. Nothing was exported — try again.",
      });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <DialogShell
      open={open}
      onOpenChange={onOpenChange}
      title="Export approved hours (CSV)"
      description={`${departmentLabel} · ${period.label}`}
      icon={Download}
      iconTone="brand"
      footer={
        <>
          <ActionButton variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </ActionButton>
          <ActionButton
            size="sm"
            onClick={handleDownload}
            disabled={previewPending || Boolean(previewError) || nothingApproved || downloading}
          >
            {downloading ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <Download className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            )}
            {downloading ? "Preparing…" : "Download CSV"}
          </ActionButton>
        </>
      }
    >
      <div className="mb-4 grid grid-cols-3 gap-3">
        {[
          { label: "Rows", value: previewPending ? "Checking…" : `${previewRows.length} rows` },
          { label: "Scope", value: departmentLabel },
          { label: "Format", value: "CSV · approved" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-border bg-muted/20 p-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {stat.label}
            </div>
            <div className="mt-1 text-xs font-bold text-foreground">{stat.value}</div>
          </div>
        ))}
      </div>

      {previewPending && (
        <div role="status" className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Calculating approved hours…
        </div>
      )}
      {staleNotice && (
        <div
          role="alert"
          className="mb-4 rounded-xl border border-warning/40 bg-warning-soft p-3 text-xs text-warning"
        >
          {staleNotice}
        </div>
      )}
      {previewError && (
        <div
          role="alert"
          className="mb-4 rounded-xl border border-danger/30 bg-danger-soft p-3 text-xs text-danger"
        >
          <p>{previewError.message}</p>
          {previewError.referenceId && (
            <p className="mt-1 font-mono">Reference: {previewError.referenceId}</p>
          )}
        </div>
      )}
      {!previewPending && !previewError && (
        <div className="overflow-hidden rounded-2xl border border-border bg-muted/10">
          <div className="max-h-48 overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/20 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="px-3 py-2">Staff record ID</th>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Approved hours</th>
                  <th className="px-3 py-2">Department</th>
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row) => (
                  <tr key={row.id} className="border-b border-border/40 last:border-0">
                    <td className="px-3 py-2 font-mono text-muted-foreground">{row.id}</td>
                    <td className="px-3 py-2 font-medium">{row.name}</td>
                    <td className="px-3 py-2 font-mono">{row.approvedHours}</td>
                    <td className="px-3 py-2">{row.department || "Not set"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {nothingApproved && (
        <div className="mt-4 rounded-xl border border-warning/40 bg-warning-soft p-2.5 text-[11px] text-warning">
          No approved hours in {period.label} for {departmentLabel.toLowerCase()}.
        </div>
      )}
      <div className="mt-4 flex gap-2.5 rounded-xl bg-muted/10 p-2.5 text-[11px] text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>
          This preview is the exact data used for the download, and nothing is recorded until you
          press Download. Only approved entries with complete clock times are included; this is not
          a payroll export.
        </span>
      </div>
    </DialogShell>
  );
}
