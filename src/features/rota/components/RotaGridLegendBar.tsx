import { AlertTriangle } from "lucide-react";

export function RotaGridLegendBar({ staffCount }: { staffCount: number }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-border px-4 py-2.5 text-[11px] text-muted-foreground">
      <span>
        Target 100% · Breaks: 30 min unpaid for shifts ≥ 6h · {staffCount}{" "}
        {staffCount === 1 ? "staff member" : "staff members"}
      </span>
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-3 w-3 rounded-[3px] border border-dashed border-border bg-muted/40"
            aria-hidden
          />
          Day off
        </span>
        <span className="flex items-center gap-1.5 text-warning-700">
          <span
            className="inline-block h-3 w-3 rounded-[3px] border-[1.5px] border-dashed border-warning/70 bg-warning-soft/40"
            aria-hidden
          />
          Open shift
        </span>
        <span className="flex items-center gap-1.5 text-warning">
          <AlertTriangle className="h-3 w-3" aria-hidden />
          Conflict
        </span>
        <span className="hidden text-muted-foreground/70 sm:inline">
          Tip: click a shift to edit · shift-click for menu
        </span>
      </div>
    </div>
  );
}
