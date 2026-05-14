import * as React from "react";
import { ProfileCard, Pair } from "./ProfileCard";
import type { StaffProfile } from "../../types";

interface Props {
  profile: StaffProfile;
}

const MOCK_TIME_ENTRIES = [
  {
    date: "Wed, 15 Jan",
    shift: "Morning",
    role: "Barista",
    location: "Coffee House",
    clockIn: "07:55",
    clockOut: "16:05",
    breaks: "45m",
    total: "7h 25m",
  },
  {
    date: "Mon, 13 Jan",
    shift: "Morning",
    role: "Supervisor",
    location: "Front of House",
    clockIn: "07:58",
    clockOut: "16:00",
    breaks: "30m",
    total: "7h 32m",
  },
  {
    date: "Fri, 10 Jan",
    shift: "Afternoon",
    role: "Supervisor",
    location: "Front of House",
    clockIn: "14:02",
    clockOut: "22:00",
    breaks: "30m",
    total: "7h 28m",
  },
  {
    date: "Thu, 9 Jan",
    shift: "Morning",
    role: "Barista",
    location: "Coffee House",
    clockIn: "08:00",
    clockOut: "16:00",
    breaks: "45m",
    total: "7h 15m",
  },
];

const WEEK_BARS = [
  { day: "Mon", hours: 8 },
  { day: "Tue", hours: 0 },
  { day: "Wed", hours: 7.5 },
  { day: "Thu", hours: 7.5 },
  { day: "Fri", hours: 8 },
  { day: "Sat", hours: 0 },
  { day: "Sun", hours: 0 },
];
const MAX_HOURS = 10;

export function ProfileTimeTab({ profile }: Props) {
  const ts = profile.timeStats;

  return (
    <div className="space-y-4">
      {/* Top metric cards */}
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
        {/* Left: chart + entries */}
        <div className="xl:col-span-2 space-y-4">
          <ProfileCard title="Weekly hours">
            <div className="flex items-end gap-2 h-24">
              {WEEK_BARS.map(({ day, hours }) => (
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
              ))}
            </div>
          </ProfileCard>

          <ProfileCard title="Time entries">
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
                  {MOCK_TIME_ENTRIES.map((e, i) => (
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
          </ProfileCard>
        </div>

        {/* Right: attendance + breaks */}
        <div className="space-y-4">
          <ProfileCard title="Attendance summary">
            <Pair label="On-time starts" value="97%" />
            <Pair label="Late starts" value="2" />
            <Pair label="No-shows" value="0" />
            <Pair label="Missed shifts" value="0" />
          </ProfileCard>

          <ProfileCard title="Breaks summary">
            <Pair label="Average break time" value="38 min" />
            <Pair label="Missed breaks" value="0" />
            <Pair
              label="Break compliance"
              value={<span className="text-success font-semibold">Compliant</span>}
            />
          </ProfileCard>
        </div>
      </div>
    </div>
  );
}
