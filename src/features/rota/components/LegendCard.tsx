import * as React from "react";
import { Card } from "@/components/dl";
import { roleLegend } from "../data/mockData";
import { DEPT_COLOUR_PRESETS, resolvePresetIdForRole } from "../lib/deptColours";
import type { DraftShift } from "../types";

export function LegendCard({ shifts = [] }: { shifts?: DraftShift[] }) {
  const { presetCounts, openCount } = React.useMemo(() => {
    const counts: Record<string, number> = {};
    let open = 0;
    for (const shift of shifts) {
      if (shift.staffId === null) {
        open += 1;
        continue;
      }
      const presetId = resolvePresetIdForRole(shift.role);
      counts[presetId] = (counts[presetId] ?? 0) + 1;
    }
    return { presetCounts: counts, openCount: open };
  }, [shifts]);

  return (
    <Card className="p-4">
      <div className="mb-3 text-sm font-semibold">Department colours</div>
      <div className="space-y-2 text-xs">
        {roleLegend.map((item) => {
          const preset = DEPT_COLOUR_PRESETS[item.preset];
          const count = presetCounts[item.preset] ?? 0;
          return (
            <div key={item.label} className="flex items-center gap-2">
              <span
                className={`h-3 w-3 shrink-0 rounded-[4px] border ${preset?.chip ?? "bg-muted border-border"}`}
                aria-hidden
              />
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                {count} {count === 1 ? "shift" : "shifts"}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex items-center gap-2 border-t border-border/60 pt-2.5 text-xs">
        <span
          className="h-3 w-3 shrink-0 rounded-[4px] border-[1.5px] border-dashed border-warning/70 bg-warning-soft/40"
          aria-hidden
        />
        <span className="min-w-0 flex-1">Open / Unassigned</span>
        <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
          {openCount} {openCount === 1 ? "shift" : "shifts"}
        </span>
      </div>
    </Card>
  );
}
