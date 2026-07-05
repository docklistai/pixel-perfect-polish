import { Link } from "@tanstack/react-router";
import { Clock } from "lucide-react";
import { StatusBadge, type Tone } from "@/components/dl";
import { ProfileCard } from "./ProfileCard";
import type { LiveStaffProfileOps } from "../../hooks/useLiveStaffProfileOps";
import type { StoredTimesheetRow, TimesheetStatus } from "@/features/time/types";

interface Props {
  ops: LiveStaffProfileOps;
  firstName: string;
}

const STATUS_TONE: Record<TimesheetStatus, Tone> = {
  approved: "success",
  pending: "warning",
  unapproved: "danger",
};

const STATUS_LABEL: Record<TimesheetStatus, string> = {
  approved: "Approved",
  pending: "Pending",
  unapproved: "Unapproved",
};

function clockedRange(row: StoredTimesheetRow): string {
  if (row.in === "—" && row.out === "—") return "Not clocked";
  return `${row.in}-${row.out}`;
}

function ManageInTimeLink() {
  return (
    <Link
      to="/time"
      className="text-[11px] font-semibold text-brand transition-colors hover:underline"
    >
      Manage in Time
    </Link>
  );
}

/**
 * Time tab for a live staff profile: recent read-only time rows for the member.
 * Review, adjustment, approval, and export remain on the Time page.
 */
export function LiveTimeList({ ops, firstName }: Props) {
  if (ops.isTimeLoading) {
    return (
      <ProfileCard title="Recent time entries">
        <p className="text-xs text-muted-foreground">Loading time entries...</p>
      </ProfileCard>
    );
  }

  if (ops.isTimeError) {
    return (
      <ProfileCard title="Recent time entries">
        <p className="text-xs text-muted-foreground">
          Couldn't load time entries right now. Refresh to try again.
        </p>
      </ProfileCard>
    );
  }

  if (ops.timeRows.length === 0) {
    return (
      <ProfileCard title="Recent time entries" action={<ManageInTimeLink />}>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>
            No time entries recorded for this team member yet. Add or review entries for {firstName}
            from the Time page.
          </span>
        </div>
      </ProfileCard>
    );
  }

  return (
    <ProfileCard title="Recent time entries" action={<ManageInTimeLink />}>
      <ul className="divide-y divide-border/40">
        {ops.timeRows.map((row) => (
          <li key={row.id} className="grid gap-2 py-2.5 sm:grid-cols-[8rem_1fr_auto_auto]">
            <span className="text-sm font-medium">{row.workDate ?? "Date not recorded"}</span>
            <span className="min-w-0 truncate font-mono text-xs text-muted-foreground">
              {clockedRange(row)}
              {row.sched !== "—" ? ` (scheduled ${row.sched})` : ""}
            </span>
            <span className="font-mono text-xs font-semibold tabular-nums">
              {row.paid !== "—" ? row.paid : "Hours not available"}
            </span>
            <StatusBadge tone={STATUS_TONE[row.status]}>{STATUS_LABEL[row.status]}</StatusBadge>
          </li>
        ))}
      </ul>
    </ProfileCard>
  );
}
