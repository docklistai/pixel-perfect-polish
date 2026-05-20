import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Card, StatusBadge } from "@/components/dl";
import type { TimesheetItem } from "../types";

interface Props {
  items: TimesheetItem[];
}

export function DashboardTimesheets({ items }: Props) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="px-5 pb-3 pt-5">
        <div className="flex items-center justify-between gap-3">
          <div className="dock-section-eyebrow">Unapproved timesheets</div>
          <StatusBadge tone="warning">{items.length}</StatusBadge>
        </div>
      </div>
      <div className="divide-y divide-border">
        {items.map((p) => (
          <div key={p.n} className="flex items-center gap-3 px-5 py-3.5">
            <img
              src={`https://i.pravatar.cc/64?img=${p.img}`}
              className="h-8 w-8 rounded-full object-cover"
              alt=""
              loading="lazy"
              width={32}
              height={32}
            />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{p.n}</div>
              <div className="text-xs text-muted-foreground">{p.d}</div>
            </div>
            <span className="text-[11px] font-medium text-warning">{p.late}</span>
          </div>
        ))}
      </div>
      <div className="border-t border-border px-5 py-3">
        <Link
          to="/time"
          className="inline-flex items-center gap-1 text-xs font-semibold text-brand"
        >
          Review timesheets <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </Card>
  );
}
