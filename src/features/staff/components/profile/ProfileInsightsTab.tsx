import * as React from "react";
import { AlertTriangle, ChevronRight, Clock, Sparkles, Trophy } from "lucide-react";
import { ProfileCard } from "./ProfileCard";
import { PatternMetricCard, SignalRow } from "./ProfilePatternWidgets";
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
  const availabilityCount = profile.availability.conflicts;

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-4 min-w-0">
        <ProfileCard
          title="Pattern summary"
          className="p-0 overflow-hidden"
          action={
            <span className="rounded-full bg-info-soft px-2 py-0.5 text-[10px] font-semibold text-info">
              AI-assisted
            </span>
          }
        >
          <div className="border-b border-[var(--st-teal-line)] bg-[var(--st-teal-bg)] px-5 py-4">
            <div className="flex items-start gap-3">
              <div className="flex size-8 items-center justify-center rounded-full bg-brand text-white">
                <Sparkles className="h-4 w-4" aria-hidden />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold uppercase tracking-wider text-[var(--st-teal-ink)]">
                  Manager support
                </div>
                <p className="mt-1 text-sm leading-6 text-foreground text-pretty">
                  {firstName} is working a steady {hoursLabel} across the last 8 weeks. The rota
                  pattern is mostly {weeklyNotes.toLowerCase()}, the rest gap is holding at{" "}
                  {profile.workloadBalance.restGap}, and there are no short-notice absence spikes to
                  flag. Documents and availability are the main items to keep in view before the
                  next publish.
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-[var(--st-teal-ink)] hover:underline"
                  >
                    Open notes <ChevronRight className="h-3 w-3" aria-hidden />
                  </button>
                  <span className="text-muted-foreground">·</span>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-[var(--st-teal-ink)] hover:underline"
                  >
                    Check documents <ChevronRight className="h-3 w-3" aria-hidden />
                  </button>
                </div>
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
          <PatternMetricCard
            icon={AlertTriangle}
            tone="amber"
            title="Short-notice absence watch"
            metric={`${ins.shortNoticeAbsenceCount} events`}
            metricSub="Operational watch only"
            rows={[
              ["Last 30 days", `${ins.sickDaysLast30} sick days`],
              ["Last 90 days", `${ins.sickDaysLast90} sick days`],
              ["This year", `${ins.sicknessEpisodesThisYear} episodes`],
            ]}
          />
          <PatternMetricCard
            icon={Sparkles}
            tone="teal"
            title="Availability consistency"
            metric={`${ins.availabilityMatch}`}
            metricSub="Scheduled within stated availability"
            rows={[
              ["Outside availability", `${availabilityCount} shifts`],
              ["Late changes", `${profile.availability.lateChanges}`],
              ["Open shift swaps", "1 in last 30 days"],
            ]}
          />
        </div>
      </div>

      <div className="space-y-4 min-w-0">
        <ProfileCard title="Best-fit shifts">
          <div className="space-y-0">
            {[
              ["Thu evening", `${profile.insights.departmentFit} · 92% fit`],
              ["Fri evening", `${profile.insights.preferredShifts} · 91% fit`],
              ["Sat double", `Coverage fit · ${profile.insights.roleFit.toLowerCase()}`],
              ["Sun late", `${profile.scheduleStats.avoidIfPossible[0]} · review after publish`],
            ].map(([label, sub]) => (
              <div
                key={label}
                className="flex items-start gap-3 border-b border-border/40 py-2.5 last:border-0"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">{label}</div>
                  <div className="text-xs text-muted-foreground">{sub}</div>
                </div>
                <Trophy className="mt-0.5 h-3.5 w-3.5 text-[var(--teal-500)]" aria-hidden />
              </div>
            ))}
          </div>
        </ProfileCard>

        <ProfileCard title="Risk signals">
          <div className="space-y-2">
            <SignalRow
              icon={Clock}
              tone="green"
              label="Coverage fit"
              value={profile.insights.roleFit}
              sub="Steady match for current rota"
            />
            <SignalRow
              icon={AlertTriangle}
              tone="green"
              label="Rest gap"
              value={profile.workloadBalance.restGap}
              sub="Healthy between shifts"
            />
            <SignalRow
              icon={Sparkles}
              tone="green"
              label="Availability match"
              value={profile.insights.availabilityMatch}
              sub="Mostly inside stated windows"
            />
            <SignalRow
              icon={AlertTriangle}
              tone={availabilityCount > 0 ? "amber" : "green"}
              label="Manager review"
              value={availabilityCount > 0 ? "Check next publish" : "Low"}
              sub="Keep an eye on coverage changes"
            />
          </div>
        </ProfileCard>
      </div>
    </div>
  );
}
