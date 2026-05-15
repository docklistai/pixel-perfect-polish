import * as React from "react";
import { ProfileCard, Pair } from "./ProfileCard";
import type { StaffProfile } from "../../types";

interface Props {
  profile: StaffProfile;
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MAX_HOURS = 10;

export function ProfileTimeTab({ profile }: Props) {
  const ts = profile.timeStats;
  const ins = profile.insights;
  const bs = profile.breakSummary;
  const weekly = profile.weeklyHours ?? [];
  const hasWeekly = weekly.some((h) => h > 0);
  const entries = profile.timeEntries ?? [];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: "Hours this week", value: ts.hoursThisWeek > 0 ? `${ts.hoursThisWeek}h` : "—" },
          {
            label: "Average weekly hours",
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
            <div className="text-2xl font-bold tracking-tight">{value}</div>
          </ProfileCard>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 space-y-4">
          <ProfileCard title="Weekly hours">
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
              <p className="text-xs text-muted-foreground py-2">
                No hours recorded for this week yet.
              </p>
            )}
          </ProfileCard>

          <ProfileCard title="Recent time entries">
            {entries.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">No time entries recorded yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border text-[10px] uppercase tracking-widest text-muted-foreground">
                      {[
                        "Date",
                        "Shift",
                        "Role",
                        "Location",
                        "Clock in",
                        "Clock out",
                        "Breaks",
                        "Total",
                      ].map((h) => (
                        <th key={h} className="text-left py-2 pr-3 last:pr-0">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((e, i) => (
                      <tr key={i} className="border-b border-border/40 last:border-0">
                        <td className="py-2.5 pr-3 font-medium">{e.date}</td>
                        <td className="py-2.5 pr-3 text-muted-foreground">{e.shift}</td>
                        <td className="py-2.5 pr-3">{e.role}</td>
                        <td className="py-2.5 pr-3 text-muted-foreground">{e.location}</td>
                        <td className="py-2.5 pr-3 font-mono">{e.clockIn}</td>
                        <td className="py-2.5 pr-3 font-mono">{e.clockOut}</td>
                        <td className="py-2.5 pr-3 text-muted-foreground">{e.breaks}</td>
                        <td className="py-2.5 font-semibold">{e.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </ProfileCard>
        </div>

        <div className="space-y-4">
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

          <ProfileCard title="Breaks summary">
            <Pair label="Average break time" value={bs?.averageBreak ?? "—"} />
            <Pair label="Missed breaks" value={bs?.missedBreaks ?? "—"} />
            <Pair
              label="Break compliance"
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
