import { Link } from "@tanstack/react-router";
import { Users, ArrowRight } from "lucide-react";
import { Card, StatusBadge } from "@/components/dl";
import type { StaffDeptItem } from "../types";

interface Props {
  items: StaffDeptItem[];
  total: number;
}

export function DashboardStaffOnShift({ items, total }: Props) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="px-5 pb-3 pt-5">
        <div className="flex items-center justify-between gap-3">
          <div className="dock-section-eyebrow">Staff on shift today</div>
          <StatusBadge tone="muted">{total}</StatusBadge>
        </div>
      </div>
      <div className="divide-y divide-border">
        {items.map(({ dept, count }) => (
          <div key={dept} className="flex items-center gap-3 px-5 py-3.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-muted text-muted-foreground">
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1 text-sm">{dept}</div>
            <div className="text-sm font-semibold">{count}</div>
          </div>
        ))}
      </div>
      <div className="border-t border-border px-5 py-3">
        <Link
          to="/rota"
          className="inline-flex items-center gap-1 text-xs font-semibold text-brand"
        >
          View today's roster <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </Card>
  );
}
