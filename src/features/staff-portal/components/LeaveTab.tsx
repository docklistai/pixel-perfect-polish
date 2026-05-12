import * as React from "react";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock4,
  HelpCircle,
  Pencil,
} from "lucide-react";
import {
  ActionButton,
  DashboardCard,
  DetailRow,
  DrawerShell,
  FormRow,
  FormSection,
  StatusBadge,
} from "@/components/dl";
import {
  mockApprovedLeave,
  mockAvailability,
  mockLeaveBalances,
  mockRequests,
} from "../data/mockPortalData";
import type { PortalRequest, RequestKind, RequestStatus } from "../types";

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
  const [kind, setKind] = React.useState<RequestKind>("time-off");
  const [detail, setDetail] = React.useState<PortalRequest | null>(null);

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
        <button
          type="button"
          className="mt-3 w-full text-center text-xs font-semibold text-brand hover:underline"
        >
          View full balances
        </button>
      </DashboardCard>

      <ActionButton
        icon={CalendarDays}
        className="w-full justify-center"
        onClick={() => {
          setKind("time-off");
          setOpen(true);
        }}
      >
        Request time off
      </ActionButton>

      {/* Upcoming approved leave */}
      {mockApprovedLeave.length > 0 && (
        <DashboardCard className="p-5">
          <div className="text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
            UPCOMING APPROVED LEAVE
          </div>
          <ul className="mt-3 space-y-2">
            {mockApprovedLeave.map((l) => (
              <li
                key={l.id}
                className="flex items-center justify-between rounded-2xl border border-border px-3 py-2.5"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <CalendarDays className="h-4 w-4 text-brand shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">{l.rangeLabel}</div>
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
          <button
            type="button"
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand hover:underline"
          >
            <Pencil className="h-3 w-3" /> Edit
          </button>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <button
            type="button"
            aria-label="Previous week"
            className="p-1 rounded-md hover:bg-muted/60"
          >
            <ChevronLeft className="h-4 w-4 text-muted-foreground" />
          </button>
          <div className="text-xs text-foreground font-medium">13 – 19 May 2024</div>
          <button type="button" aria-label="Next week" className="p-1 rounded-md hover:bg-muted/60">
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
          {mockRequests.map((r) => (
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

      {/* New request drawer */}
      <DrawerShell
        open={open}
        onOpenChange={setOpen}
        title={`New request · ${kindLabel[kind]}`}
        description="Mock form — nothing is submitted."
        width="lg"
        footer={
          <>
            <ActionButton variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </ActionButton>
            <ActionButton onClick={() => setOpen(false)}>Submit (mock)</ActionButton>
          </>
        }
      >
        <FormSection title="Details">
          <FormRow label="Type">
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as RequestKind)}
              className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
            >
              <option value="time-off">Time off</option>
              <option value="availability">Availability change</option>
              <option value="shift-question">Shift question</option>
            </select>
          </FormRow>
          <FormRow label="From">
            <input
              type="date"
              className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
            />
          </FormRow>
          <FormRow label="To">
            <input
              type="date"
              className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
            />
          </FormRow>
          <FormRow label="Note">
            <textarea
              rows={3}
              placeholder="Add a short note about your request"
              className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
            />
          </FormRow>
        </FormSection>
      </DrawerShell>

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

      {/* Hidden imports referenced for icons used in headers */}
      <span className="hidden">
        <Clock4 />
        <HelpCircle />
      </span>
    </div>
  );
}
