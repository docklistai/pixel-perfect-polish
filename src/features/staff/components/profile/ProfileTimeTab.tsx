import * as React from "react";
import { Download, CheckCircle } from "lucide-react";
import { ProfileCard, Pair } from "./ProfileCard";
import { ProfileTimesheetTable } from "./ProfileTimesheetTable";
import type { StaffProfile } from "../../types";

interface Props {
  profile: StaffProfile;
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MAX_HOURS = 10;

function buildDemoTimesheets(profile: StaffProfile) {
  const days = [
    "Sun 7 Jun",
    "Sat 6 Jun",
    "Fri 5 Jun",
    "Thu 4 Jun",
    "Wed 3 Jun",
    "Tue 2 Jun",
    "Mon 1 Jun",
    "Sun 31 May",
    "Sat 30 May",
    "Fri 29 May",
  ];
  const seed = profile.id.charCodeAt(0) || 1;
  return days.map((d, i) => {
    const drift = (seed + i) % 4;
    const actualIn = drift === 0 ? "08:14" : drift === 1 ? "07:56" : "08:02";
    const actualOut = drift === 0 ? "16:02" : drift === 1 ? "15:58" : "15:54";
    const status: "pending" | "flagged" | "approved" =
      i === 0 ? "pending" : i === 1 ? "flagged" : i === 4 ? "flagged" : "approved";
    return {
      day: d,
      scheduled: "08:00 – 16:00",
      actual: `${actualIn} – ${actualOut}`,
      hours: 7.8 + drift * 0.05,
      status,
      note:
        status === "flagged" ? (i === 1 ? "Clocked out 6 min early" : "Missed break clock") : null,
    };
  });
}

export function ProfileTimeTab({ profile }: Props) {
  const ts = profile.timeStats;
  const ins = profile.insights;
  const bs = profile.breakSummary;
  const weekly = profile.weeklyHours ?? [];
  const hasWeekly = weekly.some((h) => h > 0);
  const [toast, setToast] = React.useState<string | null>(null);

  const timesheets = React.useMemo(() => buildDemoTimesheets(profile), [profile]);

  const approvedHours = ts.hoursThisMonth;
  const pendingHours = ts.overtimeThisMonth;
  const estPay = (approvedHours * 12.5).toFixed(2);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }

  return (
    <div className="space-y-5">
      {toast && (
        <div className="rounded-xl bg-info-soft text-info text-xs font-medium px-4 py-2.5">
          {toast}
        </div>
      )}

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: "Hours this week", value: ts.hoursThisWeek > 0 ? `${ts.hoursThisWeek}h` : "—" },
          {
            label: "Avg weekly hours",
            value: ts.avgWeeklyHours > 0 ? `${ts.avgWeeklyHours}h` : "—",
          },
          {
            label: "Hours this month",
            value: ts.hoursThisMonth > 0 ? `${ts.hoursThisMonth}h` : "—",
          },
          {
            label: "Overtime this month",
            value: ts.overtimeThisMonth > 0 ? `+${ts.overtimeThisMonth}h` : "—",
          },
        ].map(({ label, value }) => (
          <ProfileCard key={label} title={label}>
            <div className="text-2xl font-bold tracking-tight tabular-nums">{value}</div>
          </ProfileCard>
        ))}
      </div>

      <ProfileTimesheetTable profileName={profile.name} rows={timesheets} onToast={showToast} />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <ProfileCard title="Clock-in pattern">
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { label: "Avg start drift", value: "+2 min" },
              { label: "On-time rate", value: `${ins.onTimeStarts}%` },
              { label: "Missed clocks", value: String(ins.lateClockIns) },
            ].map(({ label, value }) => (
              <div key={label}>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                  {label}
                </div>
                <div className="text-lg font-bold tabular-nums">{value}</div>
              </div>
            ))}
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-success rounded-full"
              style={{ width: `${ins.onTimeStarts}%` }}
            />
          </div>
          <div className="text-[11px] text-muted-foreground mt-1.5">Last 30 days</div>
        </ProfileCard>

        <ProfileCard title="Pay period · Jun 2026">
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { label: "Approved hours", value: `${approvedHours}h` },
              { label: "Pending", value: `${pendingHours}h` },
              { label: "Est. pay", value: `£${estPay}` },
            ].map(({ label, value }) => (
              <div key={label}>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                  {label}
                </div>
                <div className="text-lg font-bold tabular-nums">{value}</div>
              </div>
            ))}
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden mb-3">
            <div
              className="h-full bg-brand rounded-full"
              style={{ width: `${Math.min(100, (approvedHours / 180) * 100)}%` }}
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => showToast("All pending entries approved")}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-muted/50 transition-colors"
            >
              <CheckCircle className="h-3.5 w-3.5" aria-hidden /> Approve all
            </button>
            <button
              type="button"
              onClick={() => showToast("payslip.pdf prepared")}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-muted/50 transition-colors"
            >
              <Download className="h-3.5 w-3.5" aria-hidden /> Payslip
            </button>
          </div>
        </ProfileCard>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2">
          <ProfileCard title="Weekly hours pattern">
            {hasWeekly ? (
              <div className="flex items-end gap-2 h-24">
                {DAY_LABELS.map((day, i) => {
                  const hours = weekly[i] ?? 0;
                  return (
                    <div key={day} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className="w-full rounded-t-sm bg-brand/80"
                        style={{
                          height: `${(hours / MAX_HOURS) * 80}px`,
                          minHeight: hours > 0 ? "4px" : "0",
                        }}
                      />
                      <span className="text-[9px] text-muted-foreground uppercase font-semibold">
                        {day}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground py-2">No hours recorded this week.</p>
            )}
          </ProfileCard>
        </div>

        <div className="space-y-5">
          <ProfileCard title="Attendance summary">
            <Pair
              label="Attendance rate"
              value={ins.attendanceRate > 0 ? `${ins.attendanceRate}%` : "—"}
            />
            <Pair
              label="On-time starts"
              value={ins.onTimeStarts > 0 ? `${ins.onTimeStarts}%` : "—"}
            />
            <Pair label="Late clock-ins" value={ins.lateClockIns} />
            <Pair label="No-shows" value={ins.noShows} />
          </ProfileCard>

          <ProfileCard title="Break summary">
            <Pair label="Average break" value={bs?.averageBreak ?? "—"} />
            <Pair label="Missed breaks" value={bs?.missedBreaks ?? "—"} />
            <Pair
              label="Compliance"
              value={
                bs ? (
                  <span
                    className={
                      bs.complianceStatus === "Compliant"
                        ? "text-success font-semibold"
                        : "text-warning font-semibold"
                    }
                  >
                    {bs.complianceStatus}
                  </span>
                ) : (
                  "—"
                )
              }
            />
          </ProfileCard>
        </div>
      </div>
    </div>
  );
}
