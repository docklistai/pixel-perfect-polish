import { Card } from "@/components/dl";
import { Calendar, AlertTriangle, Heart, UserCheck } from "lucide-react";

const metrics = [
  { l: "PENDING REQUESTS", v: "4", s: "Awaiting your review", icon: UserCheck, tone: "warning" },
  { l: "APPROVED UPCOMING", v: "18", s: "Next 30 days", icon: Calendar, tone: "info" },
  { l: "COVER IMPACT TODAY", v: "2", s: "2 shifts need cover", icon: Heart, tone: "purple" },
  { l: "COVERAGE RISK", v: "Medium", s: "5 shifts at risk", icon: AlertTriangle, tone: "warning" },
] as const;

const toneBg: Record<string, string> = {
  warning: "bg-warning-soft text-warning",
  info: "bg-info-soft text-info",
  purple: "bg-accent-purple-soft text-accent-purple",
};

export function LeaveMetricCards() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-5">
      {metrics.map((t) => (
        <Card key={t.l} className="p-5">
          <div className="dock-section-eyebrow mb-3">{t.l}</div>
          <div className="flex items-center gap-3">
            <div
              aria-hidden="true"
              className={`h-12 w-12 rounded-full flex items-center justify-center ${toneBg[t.tone]}`}
            >
              <t.icon className="h-5 w-5" />
            </div>
            <div>
              <div className="text-2xl font-bold">{t.v}</div>
              <div className="text-xs text-muted-foreground">{t.s}</div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
