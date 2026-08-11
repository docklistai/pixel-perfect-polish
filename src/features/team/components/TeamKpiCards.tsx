import { Megaphone, Shield, Bell } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/dl";
import { toneBg } from "../types";
import type { TeamKpi } from "../types";

interface Props {
  items: TeamKpi[];
}

// Fixed per position, matching the original three-card design. The values and
// labels beneath them are derived live in `buildTeamKpis`.
const ICONS: LucideIcon[] = [Megaphone, Shield, Bell];

export function TeamKpiCards({ items }: Props) {
  return (
    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
      {items.map((item, index) => {
        const Icon = ICONS[index] ?? Megaphone;
        return (
          <Card key={item.label} className="p-4 flex items-center gap-3">
            <div
              className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${toneBg[item.tone]}`}
              aria-hidden
            >
              <Icon className="h-[18px] w-[18px]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-display text-[22px] font-bold leading-none tracking-tight">
                {item.value}
              </div>
              <div className="text-sm font-semibold mt-1">{item.label}</div>
              <div className="text-[11px] text-muted-foreground">{item.sub}</div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
