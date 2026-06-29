import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { CalendarClock, Loader2 } from "lucide-react";
import { fetchWorkspaceRotaWeekFn } from "@/features/rota/api/rotaLiveData";
import { MAX_ROTA_WEEK_OFFSET } from "@/features/rota/lib/rotaSearch";
import { buildLeaveRotaImpact, weekOffsetForDate } from "../lib/leaveRotaImpact";
import type { LeaveRequest } from "../types";

const leaveRouteApi = getRouteApi("/leave");

interface Props {
  request: LeaveRequest;
  /** Live "today" ISO (YYYY-MM-DD), used to resolve the leave week offset. */
  todayIso: string;
}

function firstName(name: string): string {
  return name.split(" ")[0] || name;
}

/**
 * Read-only decision support for a pending leave request in live mode. Fetches
 * the rota week the leave starts in (reusing the existing workspace-scoped,
 * RLS-backed `fetchWorkspaceRotaWeekFn`) and lists the requesting staff member's
 * scheduled shifts inside the leave window. Honest by construction: real shifts
 * or nothing — no coverage figures, no risk score, no recommendation, never the
 * demo seed. It does not change the approve/decline flow and never blocks a
 * decision.
 */
export function LeaveRotaImpactCard({ request, todayIso }: Props) {
  const { auth } = leaveRouteApi.useRouteContext();
  const navigate = useNavigate();
  const workspaceId = auth.status === "member" ? auth.workspaceId : null;
  const weekOffset = weekOffsetForDate(todayIso, request.startIso);
  const inRange = Math.abs(weekOffset) <= MAX_ROTA_WEEK_OFFSET;

  const query = useQuery({
    queryKey: ["leave", "rota-impact-week", workspaceId, weekOffset],
    queryFn: () => fetchWorkspaceRotaWeekFn({ data: { weekOffset } }),
    enabled: inRange,
    staleTime: 15_000,
  });

  const name = firstName(request.n);

  let body: ReactNode;
  let footnote: string | null = null;

  if (!inRange) {
    body = (
      <p className="muted txt-sm">
        These dates are too far out to check against the live rota. Open the rota for these dates to
        confirm coverage before deciding.
      </p>
    );
  } else if (query.isLoading) {
    body = (
      <div className="row gap-2 muted txt-sm" style={{ alignItems: "center" }}>
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> Checking the rota for these
        dates…
      </div>
    );
  } else if (query.isError || !query.data) {
    body = (
      <p className="muted txt-sm">
        Couldn&apos;t check the rota for these dates right now. Open the rota to confirm coverage
        before deciding.
      </p>
    );
  } else {
    const week = query.data;
    const impact = buildLeaveRotaImpact({
      shifts: week.shifts,
      weekStartIso: week.weekStart,
      staffId: request.staffId,
      startIso: request.startIso,
      endIso: request.endIso,
    });
    footnote = week.locationName ? `Based on the ${week.locationName} rota.` : null;

    if (!impact.leaveStartsInWeek) {
      body = (
        <p className="muted txt-sm">
          Couldn&apos;t line these dates up with a live rota week. Open the rota for these dates to
          confirm coverage before deciding.
        </p>
      );
    } else if (impact.affectedShifts.length === 0) {
      body = (
        <>
          <p className="muted txt-sm" style={{ lineHeight: 1.55 }}>
            No scheduled shifts for {name} in this leave window — approving wouldn&apos;t leave a
            shift needing cover here.
          </p>
          {impact.spansBeyondWeek && (
            <p className="muted txt-xs mt-2">
              This leave continues past this rota week — showing the first week only.
            </p>
          )}
        </>
      );
    } else {
      const count = impact.affectedShifts.length;
      body = (
        <>
          <div className="strong txt-sm">
            Approving exposes {count} scheduled shift{count === 1 ? "" : "s"} for {name}:
          </div>
          <ul className="mt-2 space-y-1.5">
            {impact.affectedShifts.map((shift) => (
              <li key={shift.id} className="row gap-2 txt-sm" style={{ alignItems: "baseline" }}>
                <span className="strong" style={{ minWidth: 96 }}>
                  {shift.dayLabel}
                </span>
                <span className="muted">{shift.role}</span>
                <span className="muted mono">
                  {shift.start}–{shift.end}
                </span>
              </li>
            ))}
          </ul>
          {impact.spansBeyondWeek && (
            <p className="muted txt-xs mt-2">
              This leave continues past this rota week — showing the first week only.
            </p>
          )}
        </>
      );
    }
  }

  return (
    <div
      className="rounded-xl border p-3.5"
      style={{ background: "var(--bg-raised)", borderColor: "var(--border)" }}
    >
      <div className="row gap-2 mb-2" style={{ alignItems: "center" }}>
        <CalendarClock className="h-3.5 w-3.5" aria-hidden />
        <span className="strong txt-sm">Rota impact</span>
        <span className="muted txt-xs">Read-only · decision support</span>
      </div>
      {body}
      {inRange && (
        <button
          type="button"
          className="btn ghost sm mt-3"
          onClick={() => void navigate({ to: "/rota", search: { week: weekOffset } })}
        >
          <CalendarClock className="h-3 w-3" aria-hidden /> Open this week in rota
        </button>
      )}
      {footnote && <p className="muted txt-xs mt-2">{footnote}</p>}
    </div>
  );
}
