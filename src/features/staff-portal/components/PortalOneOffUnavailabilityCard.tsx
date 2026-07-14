import * as React from "react";
import { toast } from "sonner";
import {
  ActionButton,
  ConfirmDialog,
  DashboardCard,
  StatusBadge,
  type Tone,
} from "@/components/dl";
import { dateIsoInTimezone } from "@/features/rota/lib/liveRotaDates";
import type {
  OneOffUnavailabilityStatus,
  PortalOneOffUnavailability,
} from "../api/oneOffUnavailability";
import { usePortalOneOffUnavailability } from "../hooks/usePortalOneOffUnavailability";
import { usePortalTimezone } from "../hooks/usePortalTimezone";

const STATUS: Record<OneOffUnavailabilityStatus, { label: string; tone: Tone }> = {
  pending: { label: "Pending", tone: "warning" },
  approved: { label: "Approved", tone: "success" },
  declined: { label: "Declined", tone: "danger" },
  withdrawn: { label: "Withdrawn", tone: "muted" },
};

function dateLabel(date: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date + "T12:00:00Z"));
}

function RequestRow({
  request,
  busy,
  onWithdraw,
}: {
  request: PortalOneOffUnavailability;
  busy: boolean;
  onWithdraw: (request: PortalOneOffUnavailability) => void;
}) {
  const status = STATUS[request.status];
  return (
    <li className="rounded-xl border border-border px-3 py-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-semibold">{dateLabel(request.date)}</div>
          {request.note && <p className="mt-0.5 text-xs text-muted-foreground">{request.note}</p>}
          {request.decisionNote && (
            <p className="mt-1 text-xs">
              <span className="font-medium">Manager note:</span> {request.decisionNote}
            </p>
          )}
        </div>
        <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
      </div>
      {request.status === "pending" && (
        <ActionButton
          className="mt-2"
          variant="ghost"
          size="sm"
          disabled={busy}
          onClick={() => onWithdraw(request)}
        >
          Withdraw
        </ActionButton>
      )}
      {request.status === "approved" && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          Ask your manager if this approved constraint needs to be changed.
        </p>
      )}
    </li>
  );
}

/** Date-specific scheduling constraint requester. This is not a leave request. */
export function PortalOneOffUnavailabilityCard() {
  const state = usePortalOneOffUnavailability();
  const timezone = usePortalTimezone();
  const [date, setDate] = React.useState("");
  const [note, setNote] = React.useState("");
  const [withdrawTarget, setWithdrawTarget] = React.useState<PortalOneOffUnavailability | null>(
    null,
  );

  if (!state.enabled) return null;
  const minDate = timezone ? dateIsoInTimezone(new Date(), timezone) : undefined;
  const submit = async () => {
    const result = await state.request(date, note.trim() || null);
    if (!result.ok) return toast.error("Request not sent", { description: result.message });
    setDate("");
    setNote("");
    toast.success("Unavailability requested", { description: "Your manager will review it." });
  };
  const withdraw = async () => {
    if (!withdrawTarget) return;
    const result = await state.withdraw(withdrawTarget.date);
    setWithdrawTarget(null);
    if (!result.ok) return toast.error("Request not withdrawn", { description: result.message });
    toast.success("Request withdrawn");
  };

  return (
    <DashboardCard className="p-5">
      <div className="text-[11px] font-semibold uppercase text-muted-foreground">
        One-off unavailability
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Tell your manager about one date you cannot work. This is a scheduling constraint, not
        leave, and it affects planning only after approval.
      </p>
      <div className="mt-3 grid gap-3">
        <label className="grid gap-1 text-xs font-medium">
          Date
          <input
            type="date"
            required
            min={minDate}
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="rounded-xl border border-border bg-card px-3 py-2 text-sm"
          />
        </label>
        <label className="grid gap-1 text-xs font-medium">
          Note <span className="font-normal text-muted-foreground">(optional)</span>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={500}
            rows={2}
            className="resize-none rounded-xl border border-border bg-card px-3 py-2 text-sm"
            placeholder="Why you cannot work that date"
          />
        </label>
        <ActionButton disabled={!date || state.isSaving} onClick={() => void submit()}>
          Request unavailability
        </ActionButton>
      </div>
      {state.isError && (
        <div role="alert" className="mt-3 text-xs text-danger">
          Requests could not be loaded.{" "}
          <button type="button" className="font-semibold underline" onClick={state.retry}>
            Try again
          </button>
        </div>
      )}
      {state.requests.length > 0 && (
        <ul className="mt-4 space-y-2">
          {state.requests.map((request) => (
            <RequestRow
              key={request.requestId}
              request={request}
              busy={state.isSaving}
              onWithdraw={setWithdrawTarget}
            />
          ))}
        </ul>
      )}
      <ConfirmDialog
        open={withdrawTarget !== null}
        onOpenChange={(open) => !open && setWithdrawTarget(null)}
        title="Withdraw this request?"
        description="Pending unavailability will no longer be considered by your manager."
        confirmLabel="Withdraw request"
        onConfirm={() => void withdraw()}
      />
    </DashboardCard>
  );
}
