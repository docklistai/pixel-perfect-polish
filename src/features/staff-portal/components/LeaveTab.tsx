import * as React from "react";
import { CalendarDays, Check, ChevronLeft, ChevronRight, Pencil } from "lucide-react";
import {
  ActionButton,
  DashboardCard,
  DetailRow,
  DrawerShell,
  FormSection,
  StatusBadge,
} from "@/components/dl";
import { useWorkspaceSelector } from "@/features/demo/store/useWorkspaceStore";
import type { PortalRequest, RequestKind, RequestStatus } from "../types";
import { PortalLeaveRequestDrawer } from "./PortalLeaveRequestDrawer";
import type { PortalLeaveRequest } from "../api/portalLiveData";
import { usePortalLeaveRequests } from "../hooks/usePortalLeaveRequests";
import { usePortalRota } from "../hooks/usePortalRota";

const statusTone: Record<RequestStatus, "warning" | "success" | "danger" | "muted"> = {
  pending: "warning",
  approved: "success",
  declined: "danger",
  cancelled: "muted",
};

const statusLabel: Record<RequestStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  declined: "Declined",
  cancelled: "Withdrawn",
};

const kindLabel: Record<RequestKind, string> = {
  "time-off": "Time off",
  availability: "Availability",
  "shift-question": "Shift question",
};

const availabilityTone = {
  available: { tone: "success" as const, label: "Available" },
  limited: { tone: "warning" as const, label: "From 12:00" },
  off: { tone: "danger" as const, label: "Unavailable" },
};

export function LeaveTab() {
  const [open, setOpen] = React.useState(false);
  const [detail, setDetail] = React.useState<PortalRequest | null>(null);

  const {
    isLive,
    approvedLeave: liveApproved,
    requestHistory: liveHistory,
  } = usePortalLeaveRequests();
  const { weekLabel } = usePortalRota();

  // Phase 13 connects these to live data.
  const approvedLeave = isLive ? liveApproved : [];
  const requestHistory = (isLive ? liveHistory : []).map(toPortalRequest);

  return (
    <div className="space-y-4">
      {/* Balance cards */}
      <DashboardCard className="p-5">
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
            LEAVE BALANCE
          </div>
          <span className="text-[11px] text-muted-foreground">As of today</span>
        </div>
        <dl className="mt-3 grid grid-cols-1 gap-2.5 text-center sm:grid-cols-3">
          <div className="rounded-2xl border border-border bg-muted/40 py-3 px-2">
            <dt className="text-[11px] text-muted-foreground">Balances</dt>
            <dd className="mt-1 text-sm font-semibold text-muted-foreground">Not available yet</dd>
          </div>
        </dl>
        <div className="mt-3 text-center text-xs text-muted-foreground">
          Live leave balances will appear here in a future update
        </div>
      </DashboardCard>

      <ActionButton
        icon={CalendarDays}
        className={
          isLive ? "w-full justify-center" : "w-full justify-center opacity-50 cursor-not-allowed"
        }
        onClick={() => {
          if (isLive) setOpen(true);
        }}
      >
        {isLive ? "Request time off" : "Request time off (not available here)"}
      </ActionButton>

      {/* Upcoming approved leave */}
      {approvedLeave.length > 0 && (
        <DashboardCard className="p-5">
          <div className="text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
            UPCOMING APPROVED LEAVE
          </div>
          <ul className="mt-3 space-y-2">
            {approvedLeave.map((l) => (
              <li
                key={l.id}
                className="flex items-center justify-between rounded-2xl border border-border px-3 py-2.5"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <CalendarDays className="h-4 w-4 text-brand shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">{l.date}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {l.type} · {l.days} days
                    </div>
                  </div>
                </div>
                <Check className="h-4 w-4 text-success" />
              </li>
            ))}
          </ul>
        </DashboardCard>
      )}

      {/* Availability strip */}
      <DashboardCard className="p-5">
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
            AVAILABILITY
          </div>
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
            <Pencil className="h-3 w-3" /> Edit
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <button
            type="button"
            aria-label="Previous week"
            className="p-1 rounded-md opacity-40"
            disabled
          >
            <ChevronLeft className="h-4 w-4 text-muted-foreground" />
          </button>
          <div className="text-xs text-foreground font-medium">{weekLabel}</div>
          <button
            type="button"
            aria-label="Next week"
            className="p-1 rounded-md opacity-40"
            disabled
          >
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
        <div className="mt-3 text-[11px] text-muted-foreground">
          Availability editing will be available in a future update
        </div>
      </DashboardCard>

      <div>
        <div className="text-[11px] font-semibold tracking-[0.18em] text-muted-foreground px-1 mb-2 uppercase">
          REQUEST HISTORY
        </div>
        {requestHistory.length === 0 ? (
          <DashboardCard className="p-4 text-center">
            <div className="text-sm font-semibold text-muted-foreground">No requests yet</div>
          </DashboardCard>
        ) : (
          <ul className="space-y-2">
            {requestHistory.map((req) => (
              <li key={req.id}>
                <button
                  type="button"
                  onClick={() => setDetail(req)}
                  className="w-full text-left rounded-2xl border border-border bg-card p-4 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate">{req.title}</div>
                      <div className="text-xs text-muted-foreground truncate">{req.detail}</div>
                    </div>
                    <StatusBadge tone={statusTone[req.status]}>
                      {statusLabel[req.status]}
                    </StatusBadge>
                  </div>
                  <div className="mt-2 text-[11px] text-muted-foreground">
                    Submitted {req.submitted}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <PortalLeaveRequestDrawer open={open} onOpenChange={setOpen} />

      {/* Detail drawer */}
      <DrawerShell
        open={detail !== null}
        onOpenChange={(o) => !o && setDetail(null)}
        title={detail?.title ?? ""}
        description={detail?.submitted}
        width="lg"
        footer={<ActionButton onClick={() => setDetail(null)}>Close</ActionButton>}
      >
        {detail && (
          <FormSection title="Request">
            <DetailRow label="Type" value={kindLabel[detail.kind]} />
            <DetailRow
              label="Status"
              value={
                <StatusBadge tone={statusTone[detail.status]}>
                  {statusLabel[detail.status]}
                </StatusBadge>
              }
            />
            <DetailRow label="Detail" value={detail.detail} />
            {detail.managerResponse && (
              <DetailRow label="Manager response" value={detail.managerResponse} />
            )}
          </FormSection>
        )}
      </DrawerShell>
    </div>
  );
}

function toPortalRequest(request: PortalLeaveRequest): PortalRequest {
  return {
    id: request.id,
    kind: "time-off",
    title: `${request.type} · ${request.date}`,
    detail: request.reason,
    submitted: request.submittedAt,
    status: request.status,
    managerResponse: request.decisionReason,
  };
}
