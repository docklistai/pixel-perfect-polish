import type { RotaGridDay } from "./types";

export function RotaGridFooter({ days }: { days: RotaGridDay[] }) {
  return (
    <>
      <div className="border-b border-border px-3 py-3">
        <div className="text-[11px] text-muted-foreground/70">
          Breaks: 30 min unpaid for shifts ≥ 6h
        </div>
      </div>
      {days.map((day) => (
        <div
          key={`footer-${day.d}`}
          className={`border-b border-l px-2 py-3 font-mono text-[11px] text-muted-foreground ${
            day.isToday ? "border-brand/20 bg-brand-soft/10" : "border-border"
          }`}
        >
          {day.h} planned
        </div>
      ))}
    </>
  );
}
