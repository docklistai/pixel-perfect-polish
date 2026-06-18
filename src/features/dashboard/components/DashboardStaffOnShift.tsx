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
          <div className="dock-section-eyebrow">On shift today</div>
          <StatusBadge tone="muted">0</StatusBadge>
        </div>
      </div>
      <div className="px-5 py-8 text-center text-sm text-muted-foreground">
        No staff currently clocked in.
      </div>
    </Card>
  );
}
