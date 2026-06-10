import * as React from "react";
import { DialogShell, ActionButton } from "@/components/dl";
import { Download, Info, FileText, Check } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportName?: string;
}

export function ReportsExportDialog({ open, onOpenChange, reportName = "weekly_report" }: Props) {
  const [downloading, setDownloading] = React.useState(false);
  const [previewing, setPreviewing] = React.useState(false);
  const [format, setFormat] = React.useState<"PDF" | "CSV" | "Excel">("PDF");
  const [options, setOptions] = React.useState({
    summary: true,
    ai: true,
    breakdown: true,
    raw: false,
    cover: true,
  });

  const handlePreview = () => {
    setPreviewing(true);
    setTimeout(() => {
      setPreviewing(false);
      toast.info("Preview ready", {
        description: "Report preview prepared — opens in a new tab",
      });
    }, 1000);
  };

  const handleDownload = () => {
    setDownloading(true);
    setTimeout(() => {
      setDownloading(false);
      onOpenChange(false);
      const filename = `${reportName.toLowerCase().replace(/\s+/g, "_")}.${format.toLowerCase()}`;
      toast.success("Export ready", {
        description: `${filename} is downloading`,
      });
    }, 1300);
  };

  const formats = [
    { id: "PDF" as const, desc: "Best for sharing" },
    { id: "CSV" as const, desc: "Best for further analysis" },
    { id: "Excel" as const, desc: "Best for spreadsheets" },
  ];

  return (
    <DialogShell
      open={open}
      onOpenChange={onOpenChange}
      icon={Download}
      iconTone="brand"
      title={`Export ${reportName}`}
      description="Choose format and what to include"
      size="md"
      footer={
        <div className="flex w-full items-center justify-end gap-2">
          <ActionButton
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={downloading}
          >
            Cancel
          </ActionButton>
          <ActionButton
            variant="secondary"
            size="sm"
            onClick={handlePreview}
            disabled={downloading || previewing}
          >
            {previewing ? "Previewing..." : "Preview"}
          </ActionButton>
          <ActionButton size="sm" onClick={handleDownload} disabled={downloading || previewing}>
            {downloading ? "Preparing..." : "Download"}
          </ActionButton>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Format Selector */}
        <div className="grid grid-cols-3 gap-2">
          {formats.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFormat(f.id)}
              className={`flex flex-col text-left p-3 rounded-xl border transition-all ${
                format === f.id
                  ? "border-brand bg-brand-soft/20 ring-1 ring-brand"
                  : "border-border bg-card hover:bg-muted/40"
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-sm font-semibold">{f.id}</span>
                {format === f.id && <Check className="h-3.5 w-3.5 text-brand" />}
              </div>
              <span className="text-[10px] text-muted-foreground mt-1.5 leading-tight">
                {f.desc}
              </span>
            </button>
          ))}
        </div>

        {/* Options Card */}
        <div className="card p-4 space-y-3 bg-muted/20 border border-border rounded-xl">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            Include
          </div>
          {[
            { key: "summary" as const, label: "Summary numbers" },
            { key: "ai" as const, label: "AI review points" },
            { key: "breakdown" as const, label: "Department breakdown" },
            { key: "raw" as const, label: "Raw rows" },
            { key: "cover" as const, label: "Cover page with logo" },
          ].map((opt) => (
            <label key={opt.key} className="flex items-center gap-3 py-1 cursor-pointer">
              <input
                type="checkbox"
                checked={options[opt.key]}
                onChange={() => setOptions({ ...options, [opt.key]: !options[opt.key] })}
                className="rounded border-input text-primary focus:ring-ring h-4 w-4"
              />
              <span className="text-sm text-foreground/80 select-none">{opt.label}</span>
            </label>
          ))}
        </div>

        {/* Info Footnote */}
        <div className="flex items-start gap-2 text-[11px] text-muted-foreground leading-normal">
          <Info className="h-3.5 w-3.5 shrink-0 text-muted-foreground/75 mt-0.5" />
          <span>Preview only — the export bundle is generated when you confirm.</span>
        </div>
      </div>
    </DialogShell>
  );
}
