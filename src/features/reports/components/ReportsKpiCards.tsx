import { MetricCard } from "@/components/dl";
import { Clock3, Percent, Plane, PoundSterling } from "lucide-react";
import type { LeaveRequest } from "@/features/leave/types";
import type { StoredTimesheetRow } from "@/features/time/types";

function paidHours(label: string): number {
  const match = label.match(/(\d+) h (\d+) m/);
  return match ? Number(match[1]) + Number(match[2]) / 60 : 0;
}

export function ReportsKpiCards({
  timeRows,
  leaveRequests,
}: {
  timeRows: StoredTimesheetRow[];
  leaveRequests: LeaveRequest[];
}) {
  const approved = timeRows.filter((row) => row.status === "approved");
  const approvedHours = approved.reduce((sum, row) => sum + paidHours(row.paid), 0);
  const pendingLeave = leaveRequests.filter((request) => request.state === "pending").length;
  const kpis = [
    {
      l: "Sample labour cost",
      v: "£20,840",
      vs: "last 4 weeks",
      icon: PoundSterling,
      tone: "brand" as const,
    },
    {
      l: "Sample labour vs sales",
      v: "28.6%",
      vs: "within 30% target",
      icon: Percent,
      tone: "warning" as const,
    },
    {
      l: "Approved hours",
      v: `${approvedHours.toFixed(1)}h`,
      vs: `${approved.length} approved entries`,
      icon: Clock3,
      tone: "info" as const,
    },
    {
      l: "Leave pending",
      v: String(pendingLeave),
      vs: "manager review queue",
      icon: Plane,
      tone: "purple" as const,
    },
  ];
  return (
    <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {kpis.map((k) => (
        <MetricCard key={k.l} icon={k.icon} label={k.l} value={k.v} sub={k.vs} tone={k.tone} />
      ))}
    </div>
  );
}
