import { Card } from "@/components/dl";
import type { RoleBudgetView } from "../lib/roleBudget";

/**
 * Per-role weekly hours against each role's budget. Renders nothing until at
 * least one role budget is set. Over-budget roles are flagged and sorted first.
 */
export function RoleBudgetCard({ view }: { view: RoleBudgetView }) {
  if (view.rows.length === 0) return null;
  return (
    <Card className="p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-sm font-semibold">Role budgets</span>
        {view.overCount > 0 && (
          <span className="text-[11px] font-semibold text-danger">{view.overCount} over</span>
        )}
      </div>
      <ul className="space-y-1.5">
        {view.rows.map((row) => {
          const ratio = row.budgetHours > 0 ? Math.min(1, row.hours / row.budgetHours) : 0;
          return (
            <li key={row.role} className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="min-w-0 truncate font-medium">{row.role}</span>
                <span
                  className={`shrink-0 font-mono tabular-nums ${row.over ? "text-danger" : "text-muted-foreground"}`}
                >
                  {Math.round(row.hours)}/{Math.round(row.budgetHours)}h
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full ${row.over ? "bg-danger" : "bg-brand"}`}
                  style={{ width: `${(row.over ? 1 : ratio) * 100}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
