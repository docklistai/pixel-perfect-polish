import type { RotaGridDay } from "./types";

export function RotaGridFooter({ days }: { days: RotaGridDay[] }) {
  return (
    <>
      <div className="border-b border-border px-4 py-3.5">
        <div className="text-xs text-muted-foreground">Staff list managed outside this rota.</div>
      </div>
      {days.map((day) => (
        <div
          key={`footer-${day.d}`}
          className={`border-b border-l px-3 py-4 text-xs text-muted-foreground ${
            day.isToday ? "border-brand/20 bg-brand-soft/10" : "border-border"
          }`}
        >
          {day.h}
        </div>
      ))}
    </>
  );
}
