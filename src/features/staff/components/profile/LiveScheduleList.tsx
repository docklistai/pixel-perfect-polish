import * as React from "react";
import { Link } from "@tanstack/react-router";
import { Calendar } from "lucide-react";
import { StatusBadge, type Tone } from "@/components/dl";
import { ProfileCard } from "./ProfileCard";
import { ProfileEmptyPanel } from "./ProfileEmptyPanel";
import type { LiveStaffProfileOps } from "../../hooks/useLiveStaffProfileOps";
import type { MemberUpcomingShift } from "../../lib/profileOperational";

interface Props {
  ops: LiveStaffProfileOps;
  firstName: string;
}

function statusTone(status: MemberUpcomingShift["status"]): Tone {
  if (status === "conflict") return "warning";
  return "success";
}

function statusLabel(status: MemberUpcomingShift["status"]): string {
  if (status === "conflict") return "Conflict";
  return "Scheduled";
}

/**
 * Schedule tab for a live staff profile: a read-only list of the member's own
 * upcoming shifts (current week + next), with a week-level deep link into the
 * rota. No editing happens here — scheduling stays on the rota page.
 */
export function LiveScheduleList({ ops, firstName }: Props) {
  if (ops.isShiftsLoading) {
    return (
      <ProfileCard title="Upcoming shifts">
        <p className="text-xs text-muted-foreground">Loading shifts…</p>
      </ProfileCard>
    );
  }

  if (ops.isShiftsError) {
    return (
      <ProfileCard title="Upcoming shifts">
        <p className="text-xs text-muted-foreground">
          Couldn't load shifts right now. Refresh to try again.
        </p>
      </ProfileCard>
    );
  }

  if (ops.scheduleShifts.length === 0) {
    return (
      <ProfileEmptyPanel
        icon={Calendar}
        title="No upcoming shifts"
        description={`${firstName} has no assigned shifts in the current or next week.`}
        hint="Add a shift from the rota to start building this view."
      />
    );
  }

  return (
    <ProfileCard
      title="Upcoming shifts"
      action={
        <Link
          to="/rota"
          search={{ week: ops.scheduleShifts[0]?.weekOffset ?? 0 }}
          className="text-[11px] font-semibold text-brand transition-colors hover:underline"
        >
          Open in rota
        </Link>
      }
    >
      {ops.multiLocation && ops.locationName ? (
        <p className="mb-3 text-[11px] text-muted-foreground">
          Showing {ops.locationName} only — open the rota for other locations.
        </p>
      ) : null}
      <ul className="divide-y divide-border/40">
        {ops.scheduleShifts.map((shift) => (
          <li key={shift.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5">
            <span className="w-28 shrink-0 text-sm font-medium">{shift.dayLabel}</span>
            <span className="shrink-0 font-mono text-xs text-muted-foreground">
              {shift.start}–{shift.end}
            </span>
            <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
              {shift.role}
            </span>
            <StatusBadge tone={statusTone(shift.status)}>{statusLabel(shift.status)}</StatusBadge>
          </li>
        ))}
      </ul>
    </ProfileCard>
  );
}
