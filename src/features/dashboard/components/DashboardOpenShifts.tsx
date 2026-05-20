import { Link } from "@tanstack/react-router";
import { Calendar, ArrowRight } from "lucide-react";
import { Card } from "@/components/dl";
import type { OpenShiftItem } from "../types";

interface Props {
  items: OpenShiftItem[];
}

export function DashboardOpenShifts({ items }: Props) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="px-5 pb-4 pt-5">
        <div className="dock-section-eyebrow">Open shifts this week</div>
        <div className="mt-4 space-y-3">
          {items.map((s) => (
            <div key={s.label} className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-warning-soft text-warning">
                <Calendar className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">{s.label}</div>
                <div className="text-xs text-muted-foreground">{s.date}</div>
              </div>
              <span className="whitespace-nowrap text-[11px] font-medium text-warning">
                {s.filled}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-border px-5 py-3">
        <Link
          to="/rota"
          className="inline-flex items-center gap-1 text-xs font-semibold text-brand"
        >
          View rota <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </Card>
  );
}
