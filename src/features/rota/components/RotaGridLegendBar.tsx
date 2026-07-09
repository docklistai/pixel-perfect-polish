import { AlertTriangle, Pencil } from "lucide-react";
import type { RoleColourKey } from "../lib/deptColours";

export function RotaGridLegendBar({
  staffCount,
  roleColours = [],
}: {
  staffCount: number;
  /** Distinct role → colour swatches present on the grid, for the colour key. */
  roleColours?: RoleColourKey[];
}) {
  return (
    <div className="rota-grid-legend flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-border px-4 py-2.5 text-[11px] text-muted-foreground">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span className="rota-grid-legend-summary">
          Target 100% · Breaks: 30 min unpaid for shifts ≥ 6h · {staffCount}{" "}
          {staffCount === 1 ? "staff member" : "staff members"}
        </span>
        {roleColours.length > 0 && (
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1" aria-label="Role colours">
            {roleColours.map((entry) => (
              <span key={entry.label} className="rota-legend-chip flex items-center gap-1.5">
                <span
                  className={`inline-block h-3 w-3 rounded-[3px] ${entry.swatch}`}
                  aria-hidden
                />
                {entry.label}
              </span>
            ))}
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="rota-legend-chip flex items-center gap-1.5">
          <span
            className="inline-block h-3 w-3 rounded-[3px] border border-dashed border-border bg-muted/40"
            aria-hidden
          />
          Day off
        </span>
        <span className="rota-legend-chip flex items-center gap-1.5 text-warning-700">
          <span
            className="inline-block h-3 w-3 rounded-[3px] border-[1.5px] border-dashed border-warning/70 bg-warning-soft/40"
            aria-hidden
          />
          Open shift
        </span>
        <span className="rota-legend-chip flex items-center gap-1.5">
          <span
            className="inline-block h-3 w-3 rounded-[3px] border border-border bg-muted/20"
            aria-hidden
          />
          Leave
        </span>
        <span className="rota-legend-chip flex items-center gap-1.5">
          <span
            className="inline-block h-3 w-3 rounded-[3px] border border-warning/40 bg-warning-soft/20"
            aria-hidden
          />
          Pending
        </span>
        <span className="rota-legend-chip flex items-center gap-1.5 text-warning">
          <AlertTriangle className="h-3 w-3" aria-hidden />
          Conflict
        </span>
        <span className="rota-legend-chip flex items-center gap-1.5">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-warning" aria-hidden />
          Edited
        </span>
        <span className="rota-legend-chip flex items-center gap-1.5">
          <Pencil className="h-2.5 w-2.5" aria-hidden />
          Colour override
        </span>
        <span className="hidden text-muted-foreground/70 lg:inline">
          Click a shift to edit · right-click for actions
        </span>
      </div>
    </div>
  );
}
