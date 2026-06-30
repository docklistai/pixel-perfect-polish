import * as React from "react";
import { Link } from "@tanstack/react-router";
import { Calendar, Plane } from "lucide-react";
import { StatusBadge } from "@/components/dl";
import { ProfileCard } from "./ProfileCard";
import type { LiveStaffProfileOps } from "../../hooks/useLiveStaffProfileOps";

interface Props {
  ops: LiveStaffProfileOps;
  firstName: string;
}

function CardLink({ to, search, label }: { to: string; search?: { week: number }; label: string }) {
  return (
    <Link
      to={to}
      search={search}
      className="text-[11px] font-semibold text-brand transition-colors hover:underline"
    >
      {label}
    </Link>
  );
}

/**
 * Overview operational strip for a live staff profile: the member's next
 * upcoming shifts and a leave summary, read-only, derived from existing
 * workspace reads. Actions link out to the rota and leave pages — this is a
 * context surface, never a control surface.
 */
export function LiveOperationalCards({ ops, firstName }: Props) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <ProfileCard
        title="Next shifts"
        action={
          <CardLink
            to="/rota"
            search={{ week: ops.overviewShifts[0]?.weekOffset ?? 0 }}
            label="Open in rota"
          />
        }
      >
        {!ops.isShiftsLoading && !ops.isShiftsError && ops.multiLocation && ops.locationName ? (
          <p className="mb-3 text-[11px] text-muted-foreground">
            Showing {ops.locationName} only — open the rota for other locations.
          </p>
        ) : null}
        {ops.isShiftsLoading ? (
          <p className="text-xs text-muted-foreground">Loading shifts…</p>
        ) : ops.isShiftsError ? (
          <p className="text-xs text-muted-foreground">Couldn't load shifts right now.</p>
        ) : ops.overviewShifts.length === 0 ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden />
            No upcoming shifts in the current or next rota week.
          </div>
        ) : (
          <ul className="space-y-2">
            {ops.overviewShifts.map((shift) => (
              <li key={shift.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0 truncate font-medium">{shift.dayLabel}</span>
                <span className="shrink-0 font-mono text-xs text-muted-foreground">
                  {shift.start}–{shift.end}
                </span>
              </li>
            ))}
          </ul>
        )}
      </ProfileCard>

      <ProfileCard title="Leave" action={<CardLink to="/leave" label="Manage in Leave" />}>
        {ops.isLeaveLoading ? (
          <p className="text-xs text-muted-foreground">Loading leave…</p>
        ) : ops.isLeaveError ? (
          <p className="text-xs text-muted-foreground">Couldn't load leave right now.</p>
        ) : ops.leaveSummary.total === 0 ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Plane className="h-3.5 w-3.5 shrink-0" aria-hidden />
            No leave on record for {firstName}.
          </div>
        ) : (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-muted-foreground">Pending requests</span>
              <StatusBadge tone={ops.leaveSummary.pendingCount > 0 ? "warning" : "muted"}>
                {ops.leaveSummary.pendingCount}
              </StatusBadge>
            </div>
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-muted-foreground">Next leave</span>
              <span className="text-right font-medium">
                {ops.leaveSummary.nextUpcoming
                  ? `${ops.leaveSummary.nextUpcoming.date} · ${ops.leaveSummary.nextUpcoming.type}`
                  : "None upcoming"}
              </span>
            </div>
          </div>
        )}
      </ProfileCard>
    </div>
  );
}
