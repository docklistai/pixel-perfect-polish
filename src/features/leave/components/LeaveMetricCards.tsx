import { MetricCard } from "@/components/dl";
import { AlertTriangle, CheckCircle2, Plane, Users } from "lucide-react";
import type { LeaveRequest } from "../types";

interface Props {
  requests: LeaveRequest[];
  /** Today (YYYY-MM-DD): real workspace date in live, demo date in demo mode. */
  todayIso: string;
}

export function LeaveMetricCards({ requests, todayIso }: Props) {
  const pending = requests.filter((request) => request.state === "pending");
  const approved = requests.filter((request) => request.state === "approved");
  const outToday = approved.filter(
    (request) => request.startIso <= todayIso && request.endIso >= todayIso,
  );
  const coverageRisk = pending.filter((request) => request.impact === "High");
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 mb-4">
      <MetricCard
        icon={AlertTriangle}
        tone="warning"
        label="Pending"
        value={pending.length}
        sub={pending.length ? "Awaiting your decision" : "All caught up"}
      />
      <MetricCard
        icon={CheckCircle2}
        tone="success"
        label="Approved"
        value={approved.length}
        sub="Currently approved"
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
