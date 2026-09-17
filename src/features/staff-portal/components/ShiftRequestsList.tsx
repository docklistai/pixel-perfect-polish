import { CalendarOff } from "lucide-react";
import { ActionButton, DashboardCard, EmptyState, StatusBadge } from "@/components/dl";
import { usePortalOpenShifts } from "../hooks/usePortalOpenShifts";
import { usePortalShiftReleases } from "../hooks/usePortalShiftReleases";
import type { OpenShiftRequestStatus, PortalOpenShiftRequest } from "../api/openShiftRequests";
import { ShiftReleaseHistoryItems } from "./ShiftReleaseHistoryItems";

const OPEN_SHIFT_STATUS: Record<
  OpenShiftRequestStatus,
  { label: string; tone: "success" | "warning" | "info" | "danger" | "muted" }
> = {
  pending: { label: "Pending", tone: "warning" },
  withdrawn: { label: "Withdrawn", tone: "muted" },
  selected: { label: "Selected — awaiting rota update", tone: "info" },
  confirmed: { label: "Confirmed", tone: "success" },
  declined: { label: "Declined", tone: "danger" },
  filled: { label: "Filled by someone else", tone: "muted" },
  stale: { label: "No longer available", tone: "warning" },
};

function OpenShiftRequestItem({ request }: { request: PortalOpenShiftRequest }) {
  const status = OPEN_SHIFT_STATUS[request.status];
  return (
    <DashboardCard className="p-4 rounded-2xl">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold truncate">
            Open shift · {request.role} · {request.dayLabel}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {request.start} – {request.end} · {request.locationName}
          </div>
          {request.decisionReason && (
            <div className="text-xs text-foreground mt-1.5">
              <span className="font-medium">Manager response:</span> {request.decisionReason}
            </div>
          )}
        </div>
        <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
      </div>
    </DashboardCard>
  );
}

/**
 * The "My requests" sub-tab: the staff member's shift-related requests only
 * (open-shift applications and shift-release requests) (§8.6).
 *
 * Staff Leave is the canonical home for employee leave requests, balances, and
 * manager responses; this surface strictly handles shift requests.
 */
export function ShiftRequestsList() {
  const openShifts = usePortalOpenShifts();
  const releases = usePortalShiftReleases();
  const shiftRequests = openShifts.enabled ? openShifts.requests : [];

  if (
    !openShifts.isLoading &&
    !openShifts.isError &&
    !releases.isLoading &&
    !releases.isError &&
    shiftRequests.length === 0 &&
    releases.requests.length === 0
  ) {
    return (
      <DashboardCard className="p-6">
        <EmptyState
          icon={CalendarOff}
          title="No shift requests yet"
          description="Open-shift applications and shift-release requests you submit will appear here. Time-off requests are in the Leave tab."
        />
      </DashboardCard>
    );
  }
  return (
    <ul className="space-y-2">
      <ShiftReleaseHistoryItems releases={releases} />
      {openShifts.enabled && openShifts.isLoading && (
        <li>
          <DashboardCard className="p-4">
            <p role="status" aria-live="polite" className="text-sm text-muted-foreground">
              Loading shift requests…
            </p>
          </DashboardCard>
        </li>
      )}
      {openShifts.enabled && openShifts.isError && (
        <li>
          <DashboardCard className="p-4">
            <div role="alert">
              <p className="text-sm font-medium">Shift requests are unavailable</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Try loading shift requests again.
              </p>
              <ActionButton
                className="mt-2"
                variant="secondary"
                size="sm"
                onClick={openShifts.retry}
              >
                Try again
              </ActionButton>
            </div>
          </DashboardCard>
        </li>
      )}
      {shiftRequests.map((request) => (
        <li key={request.requestId}>
          <OpenShiftRequestItem request={request} />
        </li>
      ))}
    </ul>
  );
}
