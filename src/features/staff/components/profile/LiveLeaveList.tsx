import * as React from "react";
import { Link } from "@tanstack/react-router";
import { Plane } from "lucide-react";
import { StatusBadge, type Tone } from "@/components/dl";
import { ProfileCard } from "./ProfileCard";
import { ProfileEmptyPanel } from "./ProfileEmptyPanel";
import type { LiveStaffProfileOps } from "../../hooks/useLiveStaffProfileOps";
import type { LeaveRequestState } from "@/features/leave/types";

interface Props {
  ops: LiveStaffProfileOps;
  firstName: string;
}

const STATE_TONE: Record<LeaveRequestState, Tone> = {
  pending: "warning",
  approved: "success",
  declined: "danger",
  cancelled: "muted",
};

const STATE_LABEL: Record<LeaveRequestState, string> = {
  pending: "Pending",
  approved: "Approved",
  declined: "Declined",
  cancelled: "Cancelled",
};

/**
 * Leave & Absence tab for a live staff profile: a read-only list of the
 * member's own leave requests. Decisions stay on the Leave page — this surface
 * only links out, it never approves, declines, or adjusts.
 */
export function LiveLeaveList({ ops, firstName }: Props) {
  if (ops.isLeaveLoading) {
    return (
      <ProfileCard title="Leave requests">
        <p className="text-xs text-muted-foreground">Loading leave…</p>
      </ProfileCard>
    );
  }

  if (ops.isLeaveError) {
    return (
      <ProfileCard title="Leave requests">
        <p className="text-xs text-muted-foreground">
          Couldn't load leave right now. Refresh to try again.
        </p>
      </ProfileCard>
    );
  }

  if (ops.leaveRequests.length === 0) {
    return (
      <ProfileEmptyPanel
        icon={Plane}
        title="No leave history yet"
        description={`Leave requests and absences appear here once they are recorded for ${firstName}.`}
      />
    );
  }

  return (
    <ProfileCard
      title="Leave requests"
      action={
        <Link
          to="/leave"
          className="text-[11px] font-semibold text-brand transition-colors hover:underline"
        >
          Manage in Leave
        </Link>
      }
    >
      <ul className="divide-y divide-border/40">
        {ops.leaveRequests.map((request) => (
          <li key={request.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5">
            <span className="w-32 shrink-0 text-sm font-medium">{request.date}</span>
            <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
              {request.type}
              {request.days > 0 ? ` · ${request.days} day${request.days === 1 ? "" : "s"}` : ""}
            </span>
            <StatusBadge tone={STATE_TONE[request.state]}>{STATE_LABEL[request.state]}</StatusBadge>
          </li>
        ))}
      </ul>
    </ProfileCard>
  );
}
