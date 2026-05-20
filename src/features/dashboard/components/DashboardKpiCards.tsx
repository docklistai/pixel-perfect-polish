import { ArrowUp, ArrowDown } from "lucide-react";
import { Card } from "@/components/dl";
import type { KpiItem } from "../types";
import { toneBg } from "../types";

interface Props {
  items: KpiItem[];
}

export function DashboardKpiCards({ items }: Props) {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="dock-section-eyebrow">Weekly overview</div>
        <div className="text-xs text-muted-foreground">Rota health snapshot</div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        {items.map((m) => (
          <div key={m.label} className="flex min-w-0 flex-col gap-2">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-[14px] ${toneBg[m.tone]}`}
            >
              <m.icon className="h-[18px] w-[18px]" />
            </div>
            <div className="text-[11px] font-medium tracking-wide text-muted-foreground">
              {m.label}
            </div>
            <div className="text-[24px] font-semibold tracking-tight">{m.value}</div>
            <div
              className={`flex items-center gap-1.5 text-xs font-medium ${
                m.up ? "text-success" : "text-danger"
              }`}
            >
              {m.up ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
              <span>{m.delta}</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
