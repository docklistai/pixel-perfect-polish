import type { RotaGridDay } from "./types";

export function RotaGridFooter({
  days,
  ariaRowIndex,
}: {
  days: RotaGridDay[];
  ariaRowIndex: number;
}) {
  return (
    <div role="row" aria-rowindex={ariaRowIndex} className="contents">
      <div
        role="rowheader"
        aria-colindex={1}
        className="border-b border-border px-3 py-3 sticky left-0 z-10 bg-background"
      >
        <div className="text-[11px] text-muted-foreground/70">
          Breaks: 30 min unpaid for shifts ≥ 6h
        </div>
      </div>
      {days.map((day, dayIndex) => (
        <div
          key={`footer-${day.d}`}
          role="gridcell"
          aria-colindex={dayIndex + 2}
          className={`border-b border-l px-2 py-3 font-mono text-[11px] text-muted-foreground ${
            day.isToday ? "border-brand/20 bg-brand-soft/10" : "border-border"
          }`}
        >
          {day.h} planned
        </div>
      ))}
    </div>
  );
}
