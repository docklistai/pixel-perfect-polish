import { Clock, ClipboardList, CalendarCheck } from "lucide-react";
import { ProfileCard } from "./ProfileCard";
import { PatternMetricCard } from "./ProfilePatternWidgets";
import { ProfilePatternTrendCard } from "./ProfilePatternTrendCard";
import type { StaffProfile } from "../../types";

interface Props {
  profile: StaffProfile;
}

export function ProfileInsightsTab({ profile }: Props) {
  const firstName = profile.name.split(" ")[0];
  const ins = profile.insights;
  const avgHours = profile.workloadBalance.avgLast4Weeks || ins.avgWeeklyHours;
  const hoursLabel = `${avgHours.toFixed(1)}h/wk`;
  const weeklyNotes = profile.scheduleStats.preferredShifts.join(" · ");

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-4 min-w-0">
        <ProfileCard title="Pattern summary" className="p-0 overflow-hidden">
          <div className="border-b border-[var(--st-teal-line)] bg-[var(--st-teal-bg)] px-5 py-4">
            <div className="flex items-start gap-3">
              <div className="flex size-8 items-center justify-center rounded-full bg-brand text-white">
                <ClipboardList className="h-4 w-4" aria-hidden />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold uppercase tracking-wider text-[var(--st-teal-ink)]">
                  Rota pattern
                </div>
                <p className="mt-1 text-sm leading-6 text-foreground text-pretty">
                  {firstName} is working a steady {hoursLabel} across the last 8 weeks. The rota
                  pattern is mostly {weeklyNotes.toLowerCase()}, and the rest gap is holding at{" "}
                  {profile.workloadBalance.restGap}. Documents and availability are the main items
                  to keep in view before the next publish.
                </p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 p-5">
            <div className="rounded-xl border border-border/40 bg-[var(--bg-raised)] px-3 py-2.5">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Average weekly hours
              </div>
              <div className="mt-1 text-lg font-bold tabular-nums">{hoursLabel}</div>
            </div>
            <div className="rounded-xl border border-border/40 bg-[var(--bg-raised)] px-3 py-2.5">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Weekend load
              </div>
              <div className="mt-1 text-lg font-bold tabular-nums">
                {profile.workloadBalance.weekendLoad}
              </div>
            </div>
            <div className="rounded-xl border border-border/40 bg-[var(--bg-raised)] px-3 py-2.5">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Rest gap
              </div>
              <div className="mt-1 text-lg font-bold tabular-nums">
                {profile.workloadBalance.restGap}
              </div>
            </div>
          </div>
        </ProfileCard>

        <ProfilePatternTrendCard contractedHours={profile.contractedHours} />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <PatternMetricCard
            icon={Clock}
            tone="teal"
            title="Consecutive shifts"
            metric={`${profile.workloadBalance.consecutiveShifts} max`}
            metricSub="Last 8 weeks · within policy"
            rows={[
              ["This week", "2 consecutive"],
              ["Last streak", "3 days"],
              ["Policy threshold", "4 in a row"],
            ]}
          />
          <PatternMetricCard
            icon={Clock}
            tone="green"
            title="Rest gap compliance"
            metric={profile.workloadBalance.restGap}
            metricSub="All shifts meet the 11h minimum"
            rows={[
              ["Average rest gap", "14h"],
              ["Tightest gap", "11h"],
              ["Below policy", "0"],
            ]}
          />
        </div>
      </div>

      <div className="space-y-4 min-w-0">
        <ProfileCard title="Schedule preferences">
          <div className="space-y-0">
            {[
              ["Preferred shifts", profile.scheduleStats.preferredShifts.join(", ") || "—"],
              ["Preferred days", profile.scheduleStats.preferredDays.join(", ") || "—"],
              ["Avoid if possible", profile.scheduleStats.avoidIfPossible.join(", ") || "—"],
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex items-start justify-between gap-3 border-b border-border/40 py-2.5 last:border-0"
              >
                <div className="text-sm font-medium">{label}</div>
                <div className="text-xs text-right text-muted-foreground">{value}</div>
              </div>
            ))}
          </div>
        </ProfileCard>

        <ProfileCard title="Availability">
          <div className="flex items-start gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--st-teal-bg)] text-[var(--st-teal-ink)]">
              <CalendarCheck className="h-4 w-4" aria-hidden />
            </div>
            <div className="min-w-0 space-y-2 text-sm">
              <div>
                <div className="text-sm font-medium">{profile.availability.usuallyAvailable}</div>
                <div className="text-xs text-muted-foreground">Usually available</div>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-border/40 pt-2 text-xs">
                <span className="text-muted-foreground">Late changes</span>
                <span className="font-medium">{profile.availability.lateChanges}</span>
              </div>
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="text-muted-foreground">Updated</span>
                <span className="font-medium">{profile.availability.updated}</span>
              </div>
            </div>
          </div>
        </ProfileCard>
      </div>
    </div>
  );
}
