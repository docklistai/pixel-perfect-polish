import * as React from "react";
import { Card } from "@/components/dl";
import type { ReportsHeatmapCell } from "../types";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const PALETTE = ["#ECFAF9", "#DCF4F3", "#A8E0DE", "#5BC2BF", "#0E9591"];

function hourLabel(hour: number) {
  if (hour === 0) return "12am";
  if (hour === 12) return "12pm";
  return `${hour > 12 ? hour - 12 : hour}${hour >= 12 ? "pm" : "am"}`;
}

export function ReportsCoverageHeatmapCard({ cells }: { cells: ReportsHeatmapCell[] }) {
  const buckets = [...new Set(cells.map((cell) => cell.bucketStartHour))].sort((a, b) => a - b);
  const max = Math.max(1, ...cells.map((cell) => cell.averageHeadcount));
  const byKey = new Map(cells.map((cell) => [`${cell.weekday}:${cell.bucketStartHour}`, cell]));
  return (
    <Card className="mt-4 p-4 lg:p-5">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">Scheduled staffing density</div>
          <div className="text-xs text-muted-foreground">
            Average assigned headcount by local three-hour bucket · unpublished weeks contribute
            zero
          </div>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <span>Lower</span>
          {PALETTE.map((color) => (
            <span key={color} className="h-2.5 w-4 rounded-sm" style={{ background: color }} />
          ))}
          <span>Higher</span>
        </div>
      </div>
      <div className="overflow-x-auto pb-1">
        <div
          className="grid min-w-[700px] gap-1"
          style={{ gridTemplateColumns: `64px repeat(${buckets.length}, minmax(64px, 1fr))` }}
        >
          <div />
          {buckets.map((bucket) => (
            <div key={bucket} className="text-center text-[11px] text-muted-foreground">
              {hourLabel(bucket)}
            </div>
          ))}
          {DAYS.map((day, weekday) => (
            <React.Fragment key={day}>
              <div className="flex items-center text-[11px] font-semibold text-muted-foreground">
                {day}
              </div>
              {buckets.map((bucket) => {
                const cell = byKey.get(`${weekday}:${bucket}`);
                const headcount = cell?.averageHeadcount ?? 0;
                const intensity = Math.min(4, Math.floor((headcount / max) * 4));
                return (
                  <div
                    key={`${day}-${bucket}`}
                    className="grid h-8 place-items-center rounded"
                    style={{ background: PALETTE[intensity] }}
                    aria-label={`${day} ${hourLabel(bucket)} to ${hourLabel(bucket + 3)}: average scheduled headcount ${headcount}`}
                  >
                    <span className="text-[10px] font-semibold text-foreground/70">
                      {headcount || "–"}
                    </span>
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">
        Density describes scheduled presence only. It does not judge whether staffing is adequate.
      </p>
    </Card>
  );
}
