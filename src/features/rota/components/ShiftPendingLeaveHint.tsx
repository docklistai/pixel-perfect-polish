import { Link } from "@tanstack/react-router";
import { pendingLeaveForStaffOnDay } from "@/features/leave/lib/leaveRotaConflicts";
import type { LeaveRequest } from "@/features/leave/types";

/**
 * Read-only context line for the shift detail drawer: the shift's staff member
 * has a pending leave request covering the shift day. Warn-only — it never
 * blocks editing or assignment; the decision itself lives in Leave.
 */
export function ShiftPendingLeaveHint({
  leaveRequests,
  staffId,
  dayIso,
}: {
  leaveRequests: LeaveRequest[];
  staffId: string | null;
  dayIso: string | undefined;
}) {
  const pending =
    staffId && dayIso ? pendingLeaveForStaffOnDay(leaveRequests, staffId, dayIso) : null;
  if (!pending) return null;

  return (
    <p className="rounded-xl border border-warning/30 bg-warning-soft/30 px-3 py-2 text-[11px] text-foreground">
      Pending leave request covers this day —{" "}
      <Link to="/leave" className="font-medium underline underline-offset-2">
        review in Leave
      </Link>
      .
    </p>
  );
}
