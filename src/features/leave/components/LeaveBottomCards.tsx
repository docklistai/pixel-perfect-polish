import { Card } from "@/components/dl";
import { AlertTriangle } from "lucide-react";
import type { LeaveRequest, LeaveSource } from "../types";
import { leaveRangesOverlap, weekRangeOf } from "../lib/leaveDates";
import { LeaveTeamBalancesCard } from "./LeaveTeamBalancesCard";

function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
}

// Illustrative UK dates only — not workspace- or region-configured. Shown with a
// clear "Sample" label so they are never read as live, configured holidays.
const publicHolidays = [
  { d: "31 Aug", name: "Summer bank holiday", flag: true },
  { d: "25 Dec", name: "Christmas Day" },
  { d: "28 Dec", name: "Boxing Day (substitute)" },
];

interface Props {
  requests: LeaveRequest[];
  source: LeaveSource;
  /** Today (YYYY-MM-DD): real workspace date in live, demo date in demo mode. */
  todayIso: string;
}

export function LeaveBottomCards({ requests, source, todayIso }: Props) {
  const { startIso, endIso } = weekRangeOf(todayIso);
  const outThisWeek = requests.filter(
    (request) =>
      request.state === "approved" &&
      leaveRangesOverlap(request.startIso, request.endIso, startIso, endIso),
  );
  return (
    <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
      <Card className="card-pad">
        <div className="section-label mb-2">Out this week</div>
        <div className="flex flex-col gap-3 mt-2">
          {outThisWeek.map((p) => (
            <div key={p.id} className="row gap-3">
              <div className="av av-c3 sm">{initials(p.n)}</div>
              <div className="grow min-w-0">
                <div className="strong txt-sm truncate">{p.n}</div>
                <div className="muted txt-xs mono">
                  {p.date} · {p.type}
                </div>
              </div>
              <span className="badge purple">{p.type}</span>
            </div>
          ))}
          {outThisWeek.length === 0 && (
            <div className="muted txt-sm">No approved leave this week.</div>
          )}
        </div>
      </Card>

      <Card className="card-pad">
        <div className="mb-2 flex items-center gap-2">
          <div className="section-label">Public holidays</div>
          <span className="badge" title="Illustrative dates — not configured for this workspace">
            Sample
          </span>
        </div>
        <div className="flex flex-col gap-3 mt-2">
          {publicHolidays.map((h) => (
            <div key={h.d} className="row gap-3">
              <span className="mono muted txt-sm" style={{ width: 64 }}>
                {h.d}
              </span>
              <span className="grow strong txt-sm">{h.name}</span>
              {h.flag && (
                <span className="badge solid-amber inline-flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" aria-hidden="true" /> Plan
                </span>
              )}
            </div>
          ))}
        </div>
      </Card>

      <LeaveTeamBalancesCard source={source} />
    </div>
  );
}
