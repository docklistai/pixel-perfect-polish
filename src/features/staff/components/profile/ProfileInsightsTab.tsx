import * as React from "react";
import { ProfileCard, Pair } from "./ProfileCard";
import type { StaffProfile } from "../../types";

interface Props {
  profile: StaffProfile;
}

function InsightMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  tone?: "success" | "warning" | "danger";
}) {
  const cls =
    tone === "success"
      ? "text-success"
      : tone === "warning"
        ? "text-warning"
        : tone === "danger"
          ? "text-danger"
          : undefined;
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-border/40 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-xs font-semibold ${cls ?? "text-foreground"}`}>{value}</span>
    </div>
  );
}

export function ProfileInsightsTab({ profile }: Props) {
  const ins = profile.insights;

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Factual, operational data to help with scheduling and staffing decisions. No judgement
        scores.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <ProfileCard title="Reliability">
          <InsightMetric
            label="Attendance rate"
            value={ins.attendanceRate > 0 ? `${ins.attendanceRate}%` : "—"}
            tone={
              ins.attendanceRate >= 95
                ? "success"
                : ins.attendanceRate >= 85
                  ? undefined
                  : "warning"
            }
          />
          <InsightMetric
            label="On-time starts"
            value={ins.onTimeStarts > 0 ? `${ins.onTimeStarts}%` : "—"}
            tone={ins.onTimeStarts >= 95 ? "success" : undefined}
          />
          <InsightMetric
            label="Late clock-ins"
            value={ins.lateClockIns > 0 ? ins.lateClockIns : "0"}
            tone={ins.lateClockIns > 3 ? "warning" : undefined}
          />
          <InsightMetric
            label="No-shows"
            value={ins.noShows > 0 ? ins.noShows : "0"}
            tone={ins.noShows > 0 ? "danger" : "success"}
          />
          <InsightMetric
            label="Short-notice absences"
            value={ins.shortNoticeAbsenceCount > 0 ? ins.shortNoticeAbsenceCount : "0"}
            tone={ins.shortNoticeAbsenceCount > 2 ? "warning" : undefined}
          />
        </ProfileCard>

        <ProfileCard title="Workload health">
          <InsightMetric
            label="Average weekly hours"
            value={ins.avgWeeklyHours > 0 ? `${ins.avgWeeklyHours}h` : "—"}
          />
          <InsightMetric
            label="Consecutive shifts"
            value={ins.consecutiveShifts > 0 ? ins.consecutiveShifts : "—"}
            tone={ins.consecutiveShifts > 5 ? "warning" : undefined}
          />
          <InsightMetric label="Rest gap" value={ins.restGap} />
          <InsightMetric
            label="Weekend load"
            value={ins.weekendLoad}
            tone={ins.weekendLoad === "4/4" ? "warning" : undefined}
          />
          <InsightMetric label="Overtime trend" value={ins.overtimeTrend} />
        </ProfileCard>

        <ProfileCard title="Scheduling fit">
          <InsightMetric
            label="Role fit"
            value={ins.roleFit}
            tone={ins.roleFit === "Excellent" ? "success" : undefined}
          />
          <InsightMetric label="Preferred shifts" value={ins.preferredShifts} />
          <InsightMetric label="Department fit" value={ins.departmentFit} />
          <InsightMetric
            label="Availability match"
            value={ins.availabilityMatch}
            tone={ins.availabilityMatch === "High" ? "success" : undefined}
          />
          <InsightMetric
            label="Certifications"
            value={ins.certificationsStatus}
            tone={ins.certificationsStatus.includes("renewal") ? "warning" : "success"}
          />
        </ProfileCard>

        <ProfileCard title="Absence trend">
          <InsightMetric
            label="Sick days last 30 days"
            value={ins.sickDaysLast30}
            tone={ins.sickDaysLast30 > 2 ? "warning" : undefined}
          />
          <InsightMetric
            label="Sick days last 90 days"
            value={ins.sickDaysLast90}
            tone={ins.sickDaysLast90 > 5 ? "warning" : undefined}
          />
          <InsightMetric label="Sickness episodes this year" value={ins.sicknessEpisodesThisYear} />
          <InsightMetric label="Short-notice absence count" value={ins.shortNoticeAbsenceCount} />
        </ProfileCard>

        <ProfileCard title="Skills & training fit" className="sm:col-span-2 xl:col-span-2">
          <p className="text-xs text-muted-foreground mb-3">
            Based on certified skills and scheduled role history.
          </p>
          <div className="grid grid-cols-2 gap-x-6">
            <Pair label="Role fit" value={ins.roleFit} />
            <Pair label="Department fit" value={ins.departmentFit} />
            <Pair label="Availability match" value={ins.availabilityMatch} />
            <Pair label="Preferred shifts" value={ins.preferredShifts} />
            <Pair label="Certifications status" value={ins.certificationsStatus} />
          </div>
        </ProfileCard>
      </div>
    </div>
  );
}
