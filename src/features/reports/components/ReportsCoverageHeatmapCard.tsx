import * as React from "react";
import { Card } from "@/components/dl";

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const slots = ["6 AM", "8 AM", "10 AM", "12 PM", "2 PM", "4 PM", "6 PM", "8 PM", "10 PM"];
const palette = ["#ECFAF9", "#DCF4F3", "#A8E0DE", "#5BC2BF", "#0E9591"];

export function ReportsCoverageHeatmapCard() {
  return (
    <Card className="mt-4 p-4 lg:p-5">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold">Coverage heatmap</div>
          <div className="text-xs text-muted-foreground">Scheduled hours by day / shift period</div>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Lower</span>
          {palette.map((color) => (
            <span
              key={color}
              className="h-2.5 w-[18px] rounded-[3px]"
              style={{ background: color }}
            />
          ))}
          <span>Higher</span>
        </div>
      </div>

      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `80px repeat(${slots.length}, minmax(0, 1fr))` }}
      >
        <div />
        {slots.map((slot) => (
          <div key={slot} className="text-center text-[11px] text-muted-foreground">
            {slot}
          </div>
        ))}
        {days.map((day, dayIndex) => (
          <React.Fragment key={day}>
            <div className="flex items-center text-[11px] font-semibold text-muted-foreground">
              {day}
            </div>
            {slots.map((slot, slotIndex) => {
              const base = [0, 1, 3, 4, 3, 2, 4, 3, 1][slotIndex];
              const dayBoost = dayIndex >= 4 ? 1 : 0;
              const intensity = Math.max(
                0,
                Math.min(4, base + dayBoost - (slotIndex === 0 ? 1 : 0)),
              );

              return (
                <div
                  key={`${day}-${slot}`}
                  className="h-[30px] rounded-[4px]"
                  style={{ background: palette[intensity] }}
                  aria-label={`${day} ${slot} coverage intensity ${intensity + 1} of 5`}
                />
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </Card>
  );
}
