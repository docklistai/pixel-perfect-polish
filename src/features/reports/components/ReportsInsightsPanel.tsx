import { Card } from "@/components/dl";
import { Lightbulb } from "lucide-react";
import { toneBg } from "../types";
import { insights } from "../data/reportsDemoData";

export function ReportsInsightsPanel() {
  return (
    <Card className="col-span-12 lg:col-span-4 rounded-2xl p-4 lg:p-5">
      <div className="flex items-center gap-2 mb-3">
        <Lightbulb className="h-4 w-4 text-warning" />
        <span className="text-[11px] font-semibold tracking-[0.18em] uppercase text-muted-foreground">
          REVIEW POINTS
        </span>
      </div>
      <div className="space-y-3">
        {insights.map((ins) => (
          <div key={ins.t} className="flex gap-3">
            <div
              className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${toneBg[ins.tone]}`}
            >
              <ins.icon className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium">{ins.t}</div>
              <div className="text-xs text-muted-foreground">{ins.s}</div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
