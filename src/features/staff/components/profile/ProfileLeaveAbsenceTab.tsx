import * as React from "react";
import { useNavigate } from "@tanstack/react-router";
import { Calendar, ChevronRight, Plane } from "lucide-react";
import { useIntents } from "@/lib/interactionIntents";
import { ProfileCard } from "./ProfileCard";
import { BalanceBar, LeaveBadge, LeaveTypeIcon } from "./ProfileLeaveWidgets";
import type { StaffProfile } from "../../types";

interface Props {
  profile: StaffProfile;
}

type LeaveRecord = {
  type: "Annual" | "Sick" | "Unpaid";
  range: string;
  days: number;
  status: "approved" | "requested" | "logged";
  approver: string | null;
  impact: string;
};

function buildLeaveRecords(profile: StaffProfile): LeaveRecord[] {
  const upcoming = profile.upcomingLeave?.[0];

  return [
    {
      type: "Annual",
      range: upcoming?.range ?? "21 – 23 Jun 2026",
      days: upcoming ? Number.parseInt(upcoming.duration, 10) || 2 : 2,
      status: upcoming?.status?.toLowerCase() === "requested" ? "requested" : "approved",
      approver: upcoming?.status?.toLowerCase() === "requested" ? "Pending" : "Alex Thompson",
      impact: "Medium · 2 conflicts",
    },
    {
      type: "Sick",
      range: "14 Mar 2026",
      days: 1,
      status: "logged",
      approver: null,
      impact: "Low · 1 absence",
    },
    {
      type: "Annual",
      range: "23 Dec – 30 Dec 2025",
      days: 5,
      status: "approved",
      approver: "Alex Thompson",
      impact: "Closed for the period",
    },
    {
      type: "Annual",
      range: "17 – 19 Jul 2026",
      days: 3,
      status: "requested",
      approver: "Pending",
      impact: "Coverage gap on Fri",
    },
    {
      type: "Unpaid",
      range: "5 Feb 2026",
      days: 1,
      status: "approved",
      approver: "Alex Thompson",
      impact: "Low",
    },
  ];
}

export function ProfileLeaveAbsenceTab({ profile }: Props) {
  const navigate = useNavigate();
  const { requestIntent } = useIntents();
  const leaveRows = buildLeaveRecords(profile);
  const upcoming = profile.upcomingLeave?.[0];
  const nextRange = upcoming?.range ?? "No upcoming leave";

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-4 min-w-0">
        <ProfileCard title="Leave history">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {["All", "Annual", "Sick", "Unpaid"].map((label, index) => (
              <button
                key={label}
                type="button"
                className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                  index === 0
                    ? "border-transparent bg-brand text-white"
                    : "border-border/40 bg-[var(--bg-raised)] text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
            <div className="ml-auto">
              <button
                type="button"
                onClick={() => {
                  navigate({ to: "/leave" });
                  requestIntent("leave.new");
                }}
                className="inline-flex items-center gap-1 rounded-xl border border-border/40 bg-[var(--bg-raised)] px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
              >
                <Calendar className="h-3.5 w-3.5" aria-hidden />
                New leave
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-y border-border text-[10px] uppercase tracking-widest text-muted-foreground">
                  <th className="px-0 py-2 text-left">Type</th>
                  <th className="px-0 py-2 text-left">Period</th>
                  <th className="px-0 py-2 text-left">Days</th>
                  <th className="px-0 py-2 text-left">Status</th>
                  <th className="px-0 py-2 text-left">Approver</th>
                  <th className="px-0 py-2 text-left">Impact</th>
                  <th className="px-0 py-2 text-right" />
                </tr>
              </thead>
              <tbody>
                {leaveRows.map((entry, index) => (
                  <tr
                    key={`${entry.range}-${index}`}
                    className="border-b border-border/40 last:border-0"
                  >
                    <td className="py-3 pr-3">
                      <div className="flex items-center gap-2">
                        <LeaveTypeIcon type={entry.type} />
                        <span className="font-semibold text-foreground">{entry.type}</span>
                      </div>
                    </td>
                    <td className="py-3 pr-3">{entry.range}</td>
                    <td className="py-3 pr-3 font-mono">{entry.days}</td>
                    <td className="py-3 pr-3">
                      <LeaveBadge status={entry.status} />
                    </td>
                    <td className="py-3 pr-3 text-muted-foreground">{entry.approver ?? "—"}</td>
                    <td className="py-3 pr-3 text-muted-foreground">{entry.impact}</td>
                    <td className="py-3 text-right text-muted-foreground">
                      <ChevronRight className="ml-auto h-3.5 w-3.5" aria-hidden />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ProfileCard>
      </div>

      <div className="space-y-4 min-w-0">
        <ProfileCard title="Balances · 2026">
          <div className="space-y-3">
            <BalanceBar
              label="Annual leave"
              used={28 - profile.leaveAbsence.annualLeaveRemaining}
              total={28}
            />
            <BalanceBar
              label="Sick days · last 12m"
              used={profile.leaveAbsence.sickDaysThisYear}
              total={10}
              tone="amber"
            />
            <BalanceBar
              label="Unpaid leave"
              used={profile.leaveAbsence.shortNoticeAbsences}
              total={5}
              tone="purple"
            />
            <BalanceBar label="TOIL" used={0} total={8} />
          </div>
          <button
            type="button"
            className="mt-4 inline-flex w-full items-center justify-center gap-1 rounded-xl border border-border/40 bg-[var(--bg-raised)] px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            Adjust balances
          </button>
        </ProfileCard>

        <ProfileCard title="Upcoming">
          {upcoming ? (
            <div className="rounded-[10px] border border-border/40 bg-[var(--st-purple-bg)] p-3">
              <div className="flex items-center gap-3">
                <div className="flex size-7 items-center justify-center rounded-full bg-accent-purple-soft text-accent-purple">
                  <Plane className="h-3.5 w-3.5" aria-hidden />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold">{nextRange}</div>
                  <div className="text-xs text-muted-foreground">
                    Annual leave · {upcoming.duration} · {upcoming.status.toLowerCase()}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p className="py-2 text-xs text-muted-foreground">No upcoming leave approved.</p>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            {profile.leaveAbsence.shortNoticeAbsences > 0
              ? "Coverage needs a quick review before publishing."
              : "No remaining coverage issues for this period."}
          </p>
        </ProfileCard>
      </div>
    </div>
  );
}
