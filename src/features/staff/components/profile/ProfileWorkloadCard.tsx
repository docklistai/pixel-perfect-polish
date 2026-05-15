import * as React from "react";
import { ProfileCard, MetricBlock } from "./ProfileCard";
import type { StaffProfile } from "../../types";

interface Props {
  wb: StaffProfile["workloadBalance"];
}

export function ProfileWorkloadCard({ wb }: Props) {
  return (
    <ProfileCard title="Workload balance" className="col-span-12 lg:col-span-8 p-5">
      <div className="flex flex-wrap gap-3">
        <MetricBlock
          label="This week"
          value={wb.hoursThisWeek > 0 ? `${wb.hoursThisWeek}h` : "—"}
        />
        <MetricBlock
          label="Avg 4 weeks"
          value={wb.avgLast4Weeks > 0 ? `${wb.avgLast4Weeks}h` : "—"}
        />
        <MetricBlock
          label="Consecutive"
          value={wb.consecutiveShifts > 0 ? String(wb.consecutiveShifts) : "—"}
        />
        <MetricBlock label="Rest gap" value={wb.restGap} />
        <MetricBlock label="Overtime" value={wb.overtimeTrend || "—"} />
      </div>
    </ProfileCard>
  );
}
