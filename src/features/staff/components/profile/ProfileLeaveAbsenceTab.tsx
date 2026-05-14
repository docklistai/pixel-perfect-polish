import * as React from "react";
import { ProfileCard, Pair } from "./ProfileCard";
import type { StaffProfile } from "../../types";

interface Props {
  profile: StaffProfile;
}

const MOCK_UPCOMING_LEAVE = [
  { range: "3 Feb – 7 Feb 2026", type: "Annual leave", duration: "5 days", status: "Approved" },
];

const MOCK_ABSENCE_HISTORY = [
  {
    date: "14 Jan 2026",
    type: "Sick",
    duration: "1 day",
    reason: "Illness",
    status: "Recorded",
    rtw: "Yes",
  },
  {
    date: "9–10 Dec 2025",
    type: "Sick",
    duration: "2 days",
    reason: "Illness",
    status: "Recorded",
    rtw: "Yes",
  },
  {
    date: "15–19 Sep 2025",
    type: "Annual leave",
    duration: "5 days",
    reason: "Holiday",
    status: "Approved",
    rtw: "N/A",
  },
];

export function ProfileLeaveAbsenceTab({ profile }: Props) {
  const la = profile.leaveAbsence;

  return (
    <div className="space-y-4">
      {/* Top metrics */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: "Annual leave remaining", value: `${la.annualLeaveRemaining} days` },
          { label: "Sick days this year", value: String(la.sickDaysThisYear) },
          { label: "Sickness episodes", value: String(la.sicknessEpisodes) },
          { label: "Short-notice absences", value: String(la.shortNoticeAbsences) },
        ].map(({ label, value }) => (
          <ProfileCard key={label} title={label}>
            <div className="text-2xl font-bold tracking-tight">{value}</div>
          </ProfileCard>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Upcoming leave */}
        <ProfileCard title="Upcoming leave">
          {MOCK_UPCOMING_LEAVE.length === 0 ? (
            <p className="text-xs text-muted-foreground">No upcoming leave approved.</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-[10px] uppercase tracking-widest text-muted-foreground">
                  <th className="text-left py-2 pr-3">Date range</th>
                  <th className="text-left py-2 pr-3">Type</th>
                  <th className="text-left py-2 pr-3">Duration</th>
                  <th className="text-left py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_UPCOMING_LEAVE.map((l, i) => (
                  <tr key={i} className="border-b border-border/40 last:border-0">
                    <td className="py-2.5 pr-3 font-medium">{l.range}</td>
                    <td className="py-2.5 pr-3 text-muted-foreground">{l.type}</td>
                    <td className="py-2.5 pr-3">{l.duration}</td>
                    <td className="py-2.5 text-success font-semibold">{l.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </ProfileCard>

        {/* Sickness summary */}
        <ProfileCard title="Sickness summary">
          <Pair label="Sick days this month" value={la.sickDaysThisMonth} />
          <Pair label="Sick days last 90 days" value={la.sickDaysLast90} />
          <Pair label="Sick days this year" value={la.sickDaysThisYear} />
          <Pair label="Sickness episodes" value={la.sicknessEpisodes} />
          <Pair label="Return to work required" value={la.returnToWorkRequired ? "Yes" : "No"} />
          <Pair label="Fit note required" value={la.fitNoteRequired ? "Yes" : "No"} />
        </ProfileCard>
      </div>

      {/* Absence history */}
      <ProfileCard title="Absence history">
        {MOCK_ABSENCE_HISTORY.length === 0 ? (
          <p className="text-xs text-muted-foreground">No absence history recorded.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-[10px] uppercase tracking-widest text-muted-foreground">
                  {["Date", "Type", "Duration", "Reason category", "Status", "Return to work"].map(
                    (h) => (
                      <th key={h} className="text-left py-2 pr-4 last:pr-0">
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {MOCK_ABSENCE_HISTORY.map((a, i) => (
                  <tr key={i} className="border-b border-border/40 last:border-0">
                    <td className="py-2.5 pr-4 font-medium">{a.date}</td>
                    <td className="py-2.5 pr-4">{a.type}</td>
                    <td className="py-2.5 pr-4 text-muted-foreground">{a.duration}</td>
                    <td className="py-2.5 pr-4 text-muted-foreground">{a.reason}</td>
                    <td className="py-2.5 pr-4 font-medium">{a.status}</td>
                    <td className="py-2.5 text-muted-foreground">{a.rtw}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ProfileCard>
    </div>
  );
}
