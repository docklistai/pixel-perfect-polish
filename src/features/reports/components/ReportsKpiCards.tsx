import { MetricCard } from "@/components/dl";
import { buildReportsKpis } from "../lib/reportsPresentation";
import type { ReportsPageData } from "../types";

export function ReportsKpiCards({ data }: { data: ReportsPageData }) {
  const kpis = buildReportsKpis(data);
  return (
    <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {kpis.map((kpi) => (
        <MetricCard
          key={kpi.label}
          icon={kpi.icon}
          label={kpi.label}
          value={kpi.value}
          sub={kpi.sub}
          tone={kpi.tone}
        />
      ))}
    </div>
  );
}
