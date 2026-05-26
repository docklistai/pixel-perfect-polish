import { MetricCard } from "@/components/dl";
import { kpis } from "../data/reportsDemoData";

export function ReportsKpiCards() {
  return (
    <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {kpis.map((k) => (
        <MetricCard
          key={k.l}
          icon={k.icon}
          label={k.l}
          value={k.v}
          sub={k.vs}
          tone={k.tone}
          delta={`${k.up ? "↑" : "↓"} ${k.d}`}
          deltaTone={k.up ? "success" : "danger"}
        />
      ))}
    </div>
  );
}
