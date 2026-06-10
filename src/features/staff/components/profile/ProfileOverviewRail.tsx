import * as React from "react";
import { AlertTriangle, ChevronRight, Plane } from "lucide-react";
import { StatusBadge, type Tone } from "@/components/dl";
import { ProfileCard, Pair } from "./ProfileCard";
import type { StaffProfile } from "../../types";
import type { ProfileTab } from "./StaffProfileTabs";

function portalTone(status: string): Tone {
  if (status === "Active") return "success";
  if (status === "Pending") return "warning";
  return "muted";
}

export function FlagsCard({
  profile,
  onTabChange,
}: {
  profile: StaffProfile;
  onTabChange?: (tab: ProfileTab) => void;
}) {
  return (
    <ProfileCard
      title="Flags"
      action={
        profile.flags.length > 0 ? (
          <span className="rounded-full bg-warning-soft px-2 py-0.5 text-[10px] font-semibold text-warning">
            {profile.flags.length}
          </span>
        ) : null
      }
      className="p-5"
    >
      {profile.flags.length === 0 ? (
        <span className="text-xs text-muted-foreground">No active flags</span>
      ) : (
        <ul className="space-y-2">
          {profile.flags.map((flag, i) => (
            <li
              key={flag}
              className="flex items-start gap-2.5 rounded-lg p-2.5"
              style={{ background: i === 0 ? "var(--warning-soft)" : "var(--danger-soft)" }}
            >
              <span
                className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                style={{
                  background: i === 0 ? "var(--warning-soft)" : "var(--danger-soft)",
                  color: i === 0 ? "var(--warning)" : "var(--danger)",
                }}
                aria-hidden
              >
                <AlertTriangle className="h-3 w-3" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium leading-snug">{flag}</div>
                {onTabChange && (
                  <button
                    type="button"
                    onClick={() => onTabChange("documents")}
                    className="mt-1 inline-flex items-center gap-0.5 text-[11px] font-semibold text-brand hover:underline"
                  >
                    Resolve
                    <ChevronRight className="h-3 w-3" aria-hidden />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </ProfileCard>
  );
}

const ANNUAL_LEAVE_TOTAL = 28;
const SICK_DAYS_MAX = 10;

interface LeaveBarProps {
  label: string;
  display: string;
  pct: number;
  barColor?: string;
}

function LeaveBar({ label, display, pct, barColor }: LeaveBarProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-xs font-semibold font-mono">{display}</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.min(100, pct)}%`, background: barColor ?? "var(--brand)" }}
          aria-hidden
        />
      </div>
    </div>
  );
}

export function LeaveAbsenceCard({ profile }: { profile: StaffProfile }) {
  const la = profile.leaveAbsence;
  const annualUsed = ANNUAL_LEAVE_TOTAL - la.annualLeaveRemaining;
  const annualPct = Math.round((annualUsed / ANNUAL_LEAVE_TOTAL) * 100);
  const sickPct = Math.round((la.sickDaysThisYear / SICK_DAYS_MAX) * 100);
  const shortNoticePct = Math.round((la.shortNoticeAbsences / 5) * 100);

  return (
    <ProfileCard title="Leave & absence" className="p-5">
      <div className="space-y-3">
        <LeaveBar
          label="Annual leave"
          display={`${annualUsed} / ${ANNUAL_LEAVE_TOTAL} days`}
          pct={annualPct}
          barColor="var(--brand)"
        />
        <LeaveBar
          label="Sick days · last 12m"
          display={String(la.sickDaysThisYear)}
          pct={sickPct}
          barColor="var(--warning)"
        />
        <LeaveBar
          label="Short-notice absences"
          display={String(la.shortNoticeAbsences)}
          pct={shortNoticePct}
          barColor="var(--accent-purple, #8b5cf6)"
        />
      </div>
      {/* Next leave callout */}
      <div
        className="mt-4 flex items-start gap-2 rounded-lg px-3 py-2.5"
        style={{ background: "var(--accent-purple-soft, #f5f3ff)" }}
      >
        <Plane
          className="h-3.5 w-3.5 shrink-0 mt-0.5"
          style={{ color: "var(--accent-purple, #8b5cf6)" }}
          aria-hidden
        />
        <div>
          <div
            className="text-xs font-semibold leading-snug"
            style={{ color: "var(--accent-purple, #8b5cf6)" }}
          >
            Next leave · 31 May – 2 Jun
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            Annual leave · approved · medium coverage impact
          </div>
        </div>
      </div>
    </ProfileCard>
  );
}

export function WorkloadBalanceCard({ profile }: { profile: StaffProfile }) {
  const wb = profile.workloadBalance;
  const contractedNum = parseInt(profile.contractedHours) || 40;
  const pct = Math.min(100, Math.round((wb.hoursThisWeek / contractedNum) * 100));

  return (
    <ProfileCard title="Workload balance" className="p-5">
      {/* Main stat */}
      <div className="mb-0.5">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
          This week
        </div>
        <div className="text-3xl font-bold tabular-nums leading-none">
          {wb.hoursThisWeek > 0 ? `${wb.hoursThisWeek}h` : "--"}
        </div>
        <div className="text-[11px] text-muted-foreground mt-0.5">
          {profile.contractedHours} contracted
        </div>
      </div>
      {/* Progress bar */}
      <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-brand transition-all"
          style={{ width: `${pct}%` }}
          aria-hidden
        />
      </div>
      {/* 3 inline mini-stats */}
      <div className="mt-4 grid grid-cols-3 gap-3 border-t border-border/50 pt-4">
        <div>
          <div className="text-[10px] text-muted-foreground mb-0.5">Last 4 wks avg</div>
          <div className="text-sm font-bold font-mono tabular-nums">
            {wb.avgLast4Weeks > 0 ? `${wb.avgLast4Weeks}h` : "--"}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-muted-foreground mb-0.5">Overtime</div>
          <div className="text-sm font-bold font-mono tabular-nums text-warning">
            {wb.overtimeTrend || "--"}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-muted-foreground mb-0.5">Rest gap min</div>
          <div className="text-sm font-bold font-mono tabular-nums">{wb.restGap || "--"}</div>
        </div>
      </div>
    </ProfileCard>
  );
}

function calcTenure(startDate: string): string {
  const d = new Date(startDate);
  if (isNaN(d.getTime())) return "—";
  const now = new Date();
  const months = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
  const years = Math.floor(months / 12);
  const rem = months % 12;
  if (years === 0) return `${rem}m`;
  if (rem === 0) return `${years}y`;
  return `${years}y ${rem}m`;
}

interface ProfileOverviewRailCardProps {
  profile: StaffProfile;
  onTabChange: (tab: ProfileTab) => void;
}

export function ProfileOverviewRailCard({
  profile,
  onTabChange: _onTabChange,
}: ProfileOverviewRailCardProps) {
  const { portalAccess: pa } = profile;
  const employeeId = `DKL-${profile.id.toUpperCase().replace(/-/g, "").slice(0, 6)}-2024`;
  const tenure = calcTenure(profile.startDate);

  return (
    <ProfileCard title="Profile" className="p-5">
      <Pair
        label="Employee ID"
        value={<span className="font-mono text-[11px]">{employeeId}</span>}
      />
      <Pair label="Start date" value={profile.startDate} />
      <Pair label="Tenure" value={tenure} />
      <Pair label="Reports to" value="Alex Thompson" />
      <Pair label="Workspace" value="Harbour View Hotel" />
      <Pair
        label="Mobile portal"
        value={<StatusBadge tone={portalTone(pa.status)}>{pa.status}</StatusBadge>}
      />
    </ProfileCard>
  );
}
