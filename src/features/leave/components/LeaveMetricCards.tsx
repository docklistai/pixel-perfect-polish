import { MetricCard } from "@/components/dl";
import { AlertTriangle, CheckCircle2, Plane, Users } from "lucide-react";

interface Props {
  pendingCount: number;
}

export function LeaveMetricCards({ pendingCount }: Props) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 mb-4">
      <MetricCard
        icon={AlertTriangle}
        tone="warning"
        label="Pending"
        value={pendingCount}
        sub="Avg wait: 2.1 days"
      />
      <MetricCard
        icon={CheckCircle2}
        tone="success"
        label="Approved (MTD)"
        value="12"
        sub="On track"
      />
      <MetricCard icon={Plane} tone="brand" label="Out today" value="2" sub="Priya · Isabella" />
      <MetricCard
        icon={Users}
        tone="danger"
        label="Coverage at risk"
        value="1"
        sub="31 May · Housekeeping"
      />
    </div>
  );
}
