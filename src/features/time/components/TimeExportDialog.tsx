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
    { id: "SC192", name: "Sophie Carter", hours: "32.0h", role: "FOH Supervisor" },
    { id: "PP447", name: "Priya Patel", hours: "40.0h", role: "Head Chef" },
    { id: "OB883", name: "Olivia Bennett", hours: "34.0h", role: "Barista" },
    { id: "NE033", name: "Noah Evans", hours: "28.0h", role: "Porter" },
  ];

  const handleDownload = () => {
    onOpenChange(false);
    toast.success("CSV ready", {
      description: "harbour_view_approved_hours_1-7-jun.csv downloading",
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
          { label: "Rows", value: "4 rows" },
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
                <th className="px-3 py-2">Role</th>
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
