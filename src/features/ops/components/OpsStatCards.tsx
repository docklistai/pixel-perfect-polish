import { Card } from "@/components/dl";
import { opsStats, toneBg } from "../data/opsDemoData";

export function OpsStatCards() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-5">
      {opsStats.map((s) => (
        <Card key={s.l} className="rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div
              className={`h-10 w-10 rounded-full flex items-center justify-center ${toneBg[s.tone]}`}
            >
              <s.icon className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="text-sm font-medium">{s.l}</div>
          </div>
          <div className="mt-3 text-3xl font-bold">{s.v}</div>
          <div className={`text-xs ${s.danger ? "text-danger" : "text-muted-foreground"} mt-1`}>
            {s.s}
          </div>
        </Card>
      ))}
    </div>
  );
}
