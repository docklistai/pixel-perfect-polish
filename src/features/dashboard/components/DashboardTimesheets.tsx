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
          <StatusBadge tone="danger">{items.length}</StatusBadge>
        </div>
      </div>
      <div className="divide-y divide-border">
        {items.map((p) => (
          <Link
            key={p.n}
            to="/time"
            className="flex items-center gap-3 px-5 py-3 transition hover:bg-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
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
            <StatusBadge tone={p.lateTone ?? "warning"}>{p.late}</StatusBadge>
          </Link>
        ))}
      </div>
      <div className="border-t border-border px-5 py-3">
        <Link
          to="/time"
          className="inline-flex items-center gap-1 text-xs font-semibold text-brand"
        >
          Review timesheets <ArrowRight className="h-3 w-3" aria-hidden />
        </Link>
      </div>
    </Card>
  );
}
