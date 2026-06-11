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
import type { LeaveRequest } from "@/features/leave/types";
import { mockAvailability, mockLeaveBalances, mockRequests } from "../data/mockPortalData";
import type { PortalRequest, RequestKind, RequestStatus } from "../types";
import { PortalLeaveRequestDrawer } from "./PortalLeaveRequestDrawer";

const statusTone: Record<RequestStatus, "warning" | "success" | "danger"> = {
  pending: "warning",
  approved: "success",
  declined: "danger",
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
  const leaveRequests = useWorkspaceSelector((state) => state.leaveRequests);
  const myLeave = leaveRequests.filter((request) => request.staffId === "olivia-bennett");
  const approvedLeave = myLeave.filter((request) => request.state === "approved");
  const requestHistory = [
    ...myLeave.map(toPortalRequest),
    ...mockRequests.filter((request) => request.kind !== "time-off"),
  ];

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
          {mockLeaveBalances.map((b) => (
            <div key={b.label} className="rounded-2xl border border-border bg-muted/40 py-3 px-2">
              <dt className="text-[11px] text-muted-foreground">{b.label}</dt>
              <dd className="mt-1 text-xl font-bold tabular-nums">{b.days.toFixed(1)}</dd>
              <div className="text-[10px] text-muted-foreground">{b.unit}</div>
            </div>
          ))}
        </dl>
        <div className="mt-3 text-center text-xs text-muted-foreground">
          Balances shown as of today
        </div>
      </DashboardCard>

      <ActionButton
        icon={CalendarDays}
        className="w-full justify-center"
        onClick={() => setOpen(true)}
      >
        Request time off
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
          <div className="text-xs text-foreground font-medium">8 – 14 Jun 2026</div>
          <button
            type="button"
            aria-label="Next week"
            className="p-1 rounded-md opacity-40"
            disabled
          >
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
        <div className="mt-3 grid grid-cols-7 gap-1.5">
          {mockAvailability.map((d) => {
            const t = availabilityTone[d.status];
            return (
              <div key={d.shortLabel} className="flex flex-col items-center gap-1">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  {d.shortLabel}
                </div>
                <div className="text-xs font-semibold">{d.date}</div>
                <StatusBadge tone={t.tone} className="text-[9px] px-1.5 py-0">
                  {t.label}
                </StatusBadge>
              </div>
            );
          })}
        </div>
        <div className="mt-3 text-[11px] text-muted-foreground">
          Default hours: Weekdays · 09:00 – 23:00
        </div>
      </DashboardCard>

      {/* Request history */}
      <div>
        <div className="text-[11px] font-semibold tracking-[0.18em] text-muted-foreground px-1 mb-2 uppercase">
          REQUEST HISTORY
        </div>
        <ul className="space-y-2">
          {requestHistory.map((r) => (
            <li key={r.id}>
              <button type="button" onClick={() => setDetail(r)} className="w-full text-left">
                <DashboardCard className="p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate">{r.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{r.submitted}</div>
                    </div>
                    <StatusBadge tone={statusTone[r.status]}>
                      {r.status[0].toUpperCase() + r.status.slice(1)}
                    </StatusBadge>
                  </div>
                </DashboardCard>
              </button>
            </li>
          ))}
        </ul>
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
                  {detail.status[0].toUpperCase() + detail.status.slice(1)}
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

function toPortalRequest(request: LeaveRequest): PortalRequest {
  const latestDecision = request.decisionHistory?.at(-1);
  return {
    id: request.id,
    kind: "time-off",
    title: `${request.type} · ${request.date}`,
    detail: request.reason,
    submitted: request.submitted,
    status: request.state,
    managerResponse: latestDecision?.reason,
  };
}
