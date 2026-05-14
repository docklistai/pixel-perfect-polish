import * as React from "react";
import { ProfileCard } from "./ProfileCard";
import type { StaffProfile, StaffProfileShift } from "../../types";

interface Props {
  profile: StaffProfile;
}

const STATUS_CLS: Record<string, string> = {
  Confirmed: "text-success",
  Completed: "text-muted-foreground",
  Absent: "text-danger",
};

function ShiftTable({ shifts, caption }: { shifts: StaffProfileShift[]; caption: string }) {
  if (shifts.length === 0) {
    return <p className="text-xs text-muted-foreground py-2">No {caption.toLowerCase()} found.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border text-[10px] uppercase tracking-widest text-muted-foreground">
            <th className="text-left py-2 pr-3">Date</th>
            <th className="text-left py-2 pr-3">Time</th>
            <th className="text-left py-2 pr-3">Role</th>
            <th className="text-left py-2 pr-3">Location</th>
            <th className="text-left py-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {shifts.map((s, i) => (
            <tr key={i} className="border-b border-border/40 last:border-0">
              <td className="py-2.5 pr-3 font-medium">{s.date}</td>
              <td className="py-2.5 pr-3 text-muted-foreground">{s.time}</td>
              <td className="py-2.5 pr-3">{s.role}</td>
              <td className="py-2.5 pr-3 text-muted-foreground">{s.location ?? "—"}</td>
              <td
                className={`py-2.5 font-medium ${STATUS_CLS[s.status ?? ""] ?? "text-foreground"}`}
              >
                {s.status ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const ROLE_COVERAGE = [
  { role: "Barista", pct: 88 },
  { role: "Front of House", pct: 95 },
  { role: "Opening shift", pct: 72 },
  { role: "Customer service", pct: 100 },
];

export function ProfileScheduleTab({ profile }: Props) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <div className="xl:col-span-2 space-y-4">
        <ProfileCard title="Upcoming shifts">
          <ShiftTable shifts={profile.upcomingShifts} caption="Upcoming shifts" />
        </ProfileCard>

        <ProfileCard title="Recent shifts">
          <ShiftTable shifts={profile.recentShifts} caption="Recent shifts" />
        </ProfileCard>
      </div>

      <div className="space-y-4">
        <ProfileCard title="Schedule preferences">
          <div className="space-y-3 text-xs">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
                Preferred days
              </div>
              <div className="flex flex-wrap gap-1">
                {profile.scheduleStats.preferredDays.length > 0 ? (
                  profile.scheduleStats.preferredDays.map((d) => (
                    <span
                      key={d}
                      className="rounded-md border border-border bg-muted/30 px-2 py-0.5 text-[11px]"
                    >
                      {d}
                    </span>
                  ))
                ) : (
                  <span className="text-muted-foreground">Not set</span>
                )}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
                Preferred shifts
              </div>
              <div className="flex flex-wrap gap-1">
                {profile.scheduleStats.preferredShifts.length > 0 ? (
                  profile.scheduleStats.preferredShifts.map((s) => (
                    <span
                      key={s}
                      className="rounded-md border border-border bg-brand-soft text-brand px-2 py-0.5 text-[11px]"
                    >
                      {s}
                    </span>
                  ))
                ) : (
                  <span className="text-muted-foreground">Not set</span>
                )}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
                Avoid if possible
              </div>
              <div className="flex flex-wrap gap-1">
                {profile.scheduleStats.avoidIfPossible.length > 0 ? (
                  profile.scheduleStats.avoidIfPossible.map((a) => (
                    <span
                      key={a}
                      className="rounded-md border border-border bg-warning-soft text-warning px-2 py-0.5 text-[11px]"
                    >
                      {a}
                    </span>
                  ))
                ) : (
                  <span className="text-muted-foreground">None</span>
                )}
              </div>
            </div>
          </div>
        </ProfileCard>

        <ProfileCard title="Role coverage">
          <div className="space-y-3">
            {ROLE_COVERAGE.map(({ role, pct }) => (
              <div key={role}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">{role}</span>
                  <span className="font-medium">{pct}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </ProfileCard>

        <ProfileCard title="Availability summary">
          <div className="text-xs space-y-1.5">
            <div className="text-muted-foreground">
              {profile.availability.usuallyAvailable || "Not specified"}
            </div>
            {profile.availability.conflicts > 0 && (
              <div className="text-warning font-medium">
                {profile.availability.conflicts} scheduling conflict
                {profile.availability.conflicts > 1 ? "s" : ""}
              </div>
            )}
            <div className="text-muted-foreground text-[11px]">
              Updated: {profile.availability.updated}
            </div>
          </div>
        </ProfileCard>
      </div>
    </div>
  );
}
