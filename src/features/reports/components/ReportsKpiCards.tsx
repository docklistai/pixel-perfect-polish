import { Card } from "@/components/dl";
import { toneBg } from "../types";
import { kpis } from "../data/reportsDemoData";

export function ReportsKpiCards() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5 mb-5">
      {kpis.map((k) => (
        <Card key={k.l} className="rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div
              className={`h-10 w-10 rounded-full flex items-center justify-center ${toneBg[k.tone]}`}
            >
              <k.icon className="h-5 w-5" />
            </div>
            <div className="text-sm font-medium">{k.l}</div>
          </div>
          <div className="mt-3 text-3xl font-bold">{k.v}</div>
          <div className="text-xs text-muted-foreground mt-1">
            {k.vs}{" "}
            <span className={`ml-1 font-semibold ${k.up ? "text-danger" : "text-success"}`}>
              {k.up ? "↑" : "↓"} {k.d}
            </span>
          </div>
        </Card>
      ))}
    </div>
  );
}
