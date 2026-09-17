import { Link } from "@tanstack/react-router";
import { ArrowRight, Calendar } from "lucide-react";
import { Card, StatusBadge } from "@/components/dl";
import { buildCompactWeekShape } from "../lib/dashboardKpis";
import type { DraftShift } from "@/features/rota/types";

interface Props {
  shifts: DraftShift[];
}

/**
 * Compact week-at-a-glance using WS-2 assignment/open truth.
 * Stated as "6 of 8 assigned · 2 open", never a Coverage percentage.
 */
export function DashboardWeekShape({ shifts }: Props) {
  const days = buildCompactWeekShape(shifts);
  const totalOpen = shifts.filter((s) => s.staffId === null).length;
  const totalAssigned = shifts.filter((s) => s.staffId !== null).length;

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-brand" aria-hidden />
          <div className="dock-section-eyebrow">This week at a glance</div>
        </div>
        <div className="flex items-center gap-2">
          {totalOpen > 0 && <StatusBadge tone="warning">{totalOpen} open</StatusBadge>}
          <span className="font-mono text-xs text-muted-foreground">{totalAssigned} assigned</span>
        </div>
      </div>
      <div className="grid grid-cols-2 divide-x divide-y divide-border sm:grid-cols-4 lg:grid-cols-7">
        {days.map((d) => (
          <div key={d.dayIndex} className="p-3.5 text-left">
            <div className="text-xs font-semibold text-foreground">{d.dayLabel}</div>
            <div className="mt-1 text-xs text-muted-foreground">{d.summary}</div>
          </div>
        ))}
      </div>
      <div className="border-t border-border px-5 py-2.5">
        <Link
          to="/rota"
          className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
        >
          Open week rota <ArrowRight className="h-3 w-3" aria-hidden />
        </Link>
      </div>
    </Card>
  );
}
