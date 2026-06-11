import { MetricCard } from "@/components/dl";
import { AlertTriangle, CheckCircle2, Plane, Users } from "lucide-react";
import { DEMO_WORLD } from "@/features/demo/data/demoWorld";
import type { LeaveRequest } from "../types";

interface Props {
  requests: LeaveRequest[];
}

export function LeaveMetricCards({ requests }: Props) {
  const pending = requests.filter((request) => request.state === "pending");
  const approved = requests.filter((request) => request.state === "approved");
  const outToday = approved.filter(
    (request) => request.startIso <= DEMO_WORLD.todayIso && request.endIso >= DEMO_WORLD.todayIso,
  );
  const coverageRisk = pending.filter((request) => request.impact === "High");
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 mb-4">
      <MetricCard
        icon={AlertTriangle}
        tone="warning"
        label="Pending"
        value={pending.length}
        sub="Avg wait: 2.1 days"
      />
      <MetricCard
        icon={CheckCircle2}
        tone="success"
        label="Approved (MTD)"
        value={approved.length}
        sub="On track"
      />
      <MetricCard
        icon={Plane}
        tone="brand"
        label="Out today"
        value={outToday.length}
        sub={outToday[0]?.n ?? "No approved leave today"}
      />
      <MetricCard
        icon={Users}
        tone="danger"
        label="Coverage at risk"
        value={coverageRisk.length}
        sub={
          coverageRisk[0]
            ? `${coverageRisk[0].date} · ${coverageRisk[0].dept}`
            : "No high-risk requests"
        }
      />
    </div>
  );
}
