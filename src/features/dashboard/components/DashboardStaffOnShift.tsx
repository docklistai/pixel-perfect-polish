import { Link } from "@tanstack/react-router";
import { Users, ArrowRight } from "lucide-react";
import { Card, StatusBadge, toneSoft } from "@/components/dl";
import type { Tone } from "@/components/dl";
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
          <div className="dock-section-eyebrow">On shift today</div>
          <StatusBadge tone="muted">{total}</StatusBadge>
        </div>
      </div>
      <div className="divide-y divide-border">
        {items.map(({ dept, count, tone }) => {
          const t = (tone ?? "muted") as Tone;
          return (
            <div key={dept} className="flex items-center gap-3 px-5 py-3">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-[8px] ${toneSoft[t]}`}
              >
                <Users className="h-3.5 w-3.5" aria-hidden />
              </div>
              <div className="flex-1 text-sm">{dept}</div>
              <div className="text-sm font-semibold">{count}</div>
            </div>
          );
        })}
      </div>
      <div className="border-t border-border px-5 py-3">
        <Link to="/ops" className="inline-flex items-center gap-1 text-xs font-semibold text-brand">
          Open live board <ArrowRight className="h-3 w-3" aria-hidden />
        </Link>
      </div>
    </Card>
  );
}
