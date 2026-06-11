import * as React from "react";
import { DialogShell, ActionButton, StatusBadge } from "@/components/dl";
import { Download, ExternalLink, Info } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TimeExportDialog({ open, onOpenChange }: Props) {
  const previewRows = [
    { id: "EM902", name: "Emma Johnson", hours: "32.5h", rate: "£14.50", wages: "£471.25" },
    { id: "LO108", name: "Liam O'Connor", hours: "28.0h", rate: "£13.50", wages: "£378.00" },
    { id: "OB883", name: "Olivia Bennett", hours: "34.0h", rate: "£12.50", wages: "£425.00" },
    { id: "DM029", name: "Daniel Mitchell", hours: "30.5h", rate: "£15.00", wages: "£457.50" },
    { id: "SC192", name: "Sophie Carter", hours: "40.0h", rate: "£16.00", wages: "£640.00" },
  ];

  const handleDownload = () => {
    onOpenChange(false);
    toast.success("CSV ready", {
      description: "harbour_view_week20.csv downloading",
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
          <ActionButton
            variant="secondary"
            size="sm"
            onClick={() => {
              onOpenChange(false);
              toast.info("Export preview", {
                description: "First 50 rows shown in browser window.",
              });
            }}
          >
            <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Preview rows
          </ActionButton>
          <ActionButton size="sm" onClick={handleDownload}>
            <Download className="mr-1.5 h-3.5 w-3.5" /> Download CSV
          </ActionButton>
        </>
      }
    >
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label: "Rows", value: "38 rows" },
          { label: "Period", value: "1 – 7 Jun 2026" },
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
                <th className="px-3 py-2">Est. Rate</th>
                <th className="px-3 py-2">Est. Wages</th>
              </tr>
            </thead>
            <tbody>
              {previewRows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-border/40 last:border-0 hover:bg-muted/10"
                >
                  <td className="px-3 py-2 font-mono text-muted-foreground">{row.id}</td>
                  <td className="px-3 py-2 font-medium">{row.name}</td>
                  <td className="px-3 py-2 font-mono">{row.hours}</td>
                  <td className="px-3 py-2 font-mono">{row.rate}</td>
                  <td className="px-3 py-2 font-mono font-semibold">{row.wages}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 flex gap-2.5 rounded-xl bg-muted/10 p-2.5 text-[11px] text-muted-foreground">
        <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
        <span>
          Only approved entries are included. Est. wages are for planning only — Docklist does not
          run pay.
        </span>
      </div>
    </DialogShell>
  );
}
