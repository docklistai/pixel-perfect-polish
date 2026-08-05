import { AlertTriangle, CheckCircle2, ClipboardCheck, FileText, Users } from "lucide-react";
import { MetricCard } from "@/components/dl";
import type { OpsMetrics } from "../types";

export function OpsStatCards({ metrics }: { metrics: OpsMetrics }) {
  const cards = [
    {
      label: "Active shifts",
      value: metrics.activeShifts,
      sub: `${metrics.onShift} staff · ${metrics.uncoveredShifts} uncovered`,
      icon: Users,
      tone: "brand" as const,
    },
    {
      label: "Tasks completed",
      value: metrics.tasksCompletedToday,
      sub: "Resolved today",
      icon: CheckCircle2,
      tone: "success" as const,
    },
    {
      label: "Open incidents",
      value: metrics.openIncidents,
      sub: "Open or in progress",
      icon: AlertTriangle,
      tone: "warning" as const,
    },
    {
      label: "Briefings posted",
      value: metrics.briefingsToday,
      sub: "Authored today",
      icon: FileText,
      tone: "purple" as const,
    },
    {
      label: "Checklists",
      value: `${metrics.checklistPercent}%`,
      sub: "Items completed today",
      icon: ClipboardCheck,
      tone: "info" as const,
    },
  ];
  return (
    <section className="mb-4" aria-labelledby="ops-glance-heading">
      <h2 id="ops-glance-heading" className="mb-2 text-xs font-semibold text-muted-foreground">
        Today at a glance
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map((card) => (
          <MetricCard key={card.label} {...card} className="min-h-[116px]" />
        ))}
      </div>
    </section>
  );
}
