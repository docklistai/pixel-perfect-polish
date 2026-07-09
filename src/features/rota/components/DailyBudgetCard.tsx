import { Card } from "@/components/dl";
import type { DailyBudgetView } from "../lib/dailyBudget";

/**
 * Compact per-day budget strip: each day's scheduled hours against the daily
 * hours budget, with over-budget days flagged. Renders nothing until a daily
 * budget is set.
 */
export function DailyBudgetCard({ view }: { view: DailyBudgetView }) {
  if (view.budgetHours <= 0) return null;
  return (
    <Card className="p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-sm font-semibold">Daily budget</span>
        <span className="text-[11px] text-muted-foreground">{Math.round(view.budgetHours)}h/day</span>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {view.days.map((day, index) => (
          <div key={index} className="flex flex-col items-center gap-0.5">
            <span className="text-[9px] font-medium uppercase text-muted-foreground">
              {day.label.split(" ")[0]}
            </span>
            <span
              className={`w-full rounded-md py-1 text-center text-[11px] font-semibold tabular-nums ${
                day.over ? "bg-danger-soft text-danger" : "bg-muted/50 text-muted-foreground"
              }`}
              title={
                day.over
                  ? `${Math.round(day.hours)}h — ${day.overBy}h over the daily budget`
                  : `${Math.round(day.hours)}h`
              }
            >
              {Math.round(day.hours)}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        {view.overCount === 0
          ? "Every day is within the daily hours budget."
          : `${view.overCount} day${view.overCount === 1 ? "" : "s"} over the daily budget.`}
      </p>
    </Card>
  );
}
