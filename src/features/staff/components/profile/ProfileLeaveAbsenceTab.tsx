import * as React from "react";
import { AlertTriangle, Calendar, ChevronRight, Plane } from "lucide-react";
import { ProfileCard } from "./ProfileCard";
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
      range: upcoming?.range ?? "31 May – 2 Jun 2026",
      days: upcoming ? Number.parseInt(upcoming.duration, 10) || 3 : 3,
      status: "approved",
      approver: "Alex Thompson",
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

function BalanceBar({
  label,
  used,
  total,
  tone = "teal",
}: {
  label: string;
  used: number;
  total: number;
  tone?: "teal" | "amber" | "purple";
}) {
  const pct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
  const fill =
    tone === "amber"
      ? "var(--st-amber-ink)"
      : tone === "purple"
        ? "var(--st-purple-ink)"
        : "var(--st-teal-ink)";

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="font-mono text-xs font-semibold tabular-nums">
          {used} / {total}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: fill }} />
      </div>
    </div>
  );
}

export function ProfileLeaveAbsenceTab({ profile }: Props) {
  const la = profile.leaveAbsence;
  const leaveRows = buildLeaveRecords(profile);
  const upcoming = profile.upcomingLeave ?? [];
  const nextLeave = upcoming[0];

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-4 min-w-0">
        <ProfileCard title="Leave history">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-y border-border text-[10px] uppercase tracking-widest text-muted-foreground">
                  <th className="px-0 py-2 text-left">Type</th>
                  <th className="px-0 py-2 text-left">Period</th>
                  <th className="px-0 py-2 text-left">Days</th>
                  <th className="px-0 py-2 text-left">Status</th>
                  <th className="px-0 py-2 text-left">Approver</th>
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
                        <div
                          className="flex size-7 items-center justify-center rounded-full"
                          style={{
                            background:
                              entry.type === "Sick"
                                ? "var(--st-red-bg)"
                                : entry.type === "Unpaid"
                                  ? "var(--st-purple-bg)"
                                  : "var(--st-teal-bg)",
                            color:
                              entry.type === "Sick"
                                ? "var(--st-red-ink)"
                                : entry.type === "Unpaid"
                                  ? "var(--st-purple-ink)"
                                  : "var(--st-teal-ink)",
                          }}
                        >
                          {entry.type === "Sick" ? (
                            <AlertTriangle className="h-3 w-3" aria-hidden />
                          ) : (
                            <Plane className="h-3 w-3" aria-hidden />
                          )}
                        </div>
                        <span className="font-semibold text-foreground">{entry.type}</span>
                      </div>
                    </td>
                    <td className="py-3 pr-3">{entry.range}</td>
                    <td className="py-3 pr-3 font-mono">{entry.days}</td>
                    <td className="py-3 pr-3">
                      {entry.status === "approved" ? (
                        <span className="inline-flex items-center rounded-full bg-success-soft px-2 py-0.5 text-[10px] font-semibold text-success">
                          Approved
                        </span>
                      ) : entry.status === "requested" ? (
                        <span className="inline-flex items-center rounded-full bg-warning-soft px-2 py-0.5 text-[10px] font-semibold text-warning">
                          Requested
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-accent-purple-soft px-2 py-0.5 text-[10px] font-semibold text-accent-purple">
                          Logged
                        </span>
                      )}
                    </td>
                    <td className="py-3 pr-3 text-muted-foreground">
                      {entry.status === "requested" ? "Pending" : (entry.approver ?? "—")}
                    </td>
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
        <ProfileCard title="Balances · 2025">
          <div className="space-y-3">
            <BalanceBar label="Annual leave" used={28 - la.annualLeaveRemaining} total={28} />
            <BalanceBar
              label="Sick days · last 12m"
              used={la.sickDaysThisYear}
              total={10}
              tone="amber"
            />
            <BalanceBar
              label="Unpaid leave"
              used={la.shortNoticeAbsences}
              total={5}
              tone="purple"
            />
          </div>
          <div
            className="mt-4 rounded-xl border border-border/40 px-3 py-2.5"
            style={{ background: "var(--st-purple-bg)" }}
          >
            <div className="flex items-start gap-2">
              <Calendar className="mt-0.5 h-3.5 w-3.5 text-[var(--st-purple-ink)]" aria-hidden />
              <div>
                <div className="text-xs font-semibold text-[var(--st-purple-ink)]">
                  Next leave · {nextLeave?.range ?? "No upcoming leave"}
                </div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">
                  {nextLeave
                    ? `${nextLeave.type} · ${nextLeave.status.toLowerCase()} · medium coverage impact`
                    : "No upcoming leave approved."}
                </div>
              </div>
            </div>
          </div>
        </ProfileCard>

        <ProfileCard title="Upcoming">
          {nextLeave ? (
            <div className="rounded-xl border border-border/40 bg-muted/20 p-3">
              <div className="flex items-center gap-3">
                <div className="flex size-7 items-center justify-center rounded-full bg-accent-purple-soft text-accent-purple">
                  <Plane className="h-3.5 w-3.5" aria-hidden />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold">{nextLeave.range}</div>
                  <div className="text-xs text-muted-foreground">
                    {nextLeave.type} · {nextLeave.duration} · {nextLeave.status.toLowerCase()}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p className="py-2 text-xs text-muted-foreground">No upcoming leave approved.</p>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            2 conflicts detected for this period - check rota.
          </p>
        </ProfileCard>
      </div>
    </div>
  );
}
