import { ArrowRight } from "lucide-react";
import { Card } from "@/components/dl";
import { toneBg } from "../types";
import type { TeamKpi } from "../types";

interface Props {
  items: TeamKpi[];
}

export function TeamKpiCards({ items }: Props) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {items.map((item) => (
        <Card key={item.l} className="rounded-2xl p-4 flex items-center gap-3">
          <div
            className={`h-12 w-12 rounded-full flex items-center justify-center shrink-0 ${toneBg[item.tone]}`}
          >
            <item.icon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{item.v}</span>
              <span className="text-sm">{item.l}</span>
            </div>
            <div className="text-xs text-muted-foreground">{item.s}</div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
        </Card>
      ))}
    </div>
  );
}
