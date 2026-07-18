import * as React from "react";
import { toast } from "sonner";
import { DashboardCard } from "@/components/dl";
import { usePortalRecurringDaysOff } from "../hooks/usePortalRecurringDaysOff";
import {
  buildWeekdayCells,
  type RecurringDayOffStatus,
  type WeekdayCell,
} from "../lib/recurringDaysOff";

const STATUS_CHIP: Record<RecurringDayOffStatus, string> = {
  pending: "border-warning bg-warning-soft/50 text-warning-700",
  approved: "border-success bg-success-soft/60 text-success",
  declined: "border-danger/60 bg-danger-soft/40 text-danger",
};

const STATUS_HINT: Record<RecurringDayOffStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  declined: "Declined",
};

function WeekdayButton({
  cell,
  disabled,
  describedBy,
  onToggle,
}: {
  cell: WeekdayCell;
  disabled: boolean;
  describedBy?: string;
  onToggle: (cell: WeekdayCell) => void;
}) {
  const request = cell.request;
  const chip = request
    ? STATUS_CHIP[request.status]
    : "border-border bg-card text-muted-foreground hover:bg-muted/50";
  const title = request
    ? `${cell.label} — ${STATUS_HINT[request.status]}. Tap to withdraw.`
    : `Request ${cell.label} off every week`;
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onToggle(cell)}
      title={title}
      aria-label={title}
      aria-pressed={request !== null}
      aria-describedby={describedBy}
      className={`flex flex-col items-center gap-0.5 rounded-xl border px-0 py-2 text-[11px] font-semibold transition disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${chip}`}
    >
      <span>{cell.shortLabel}</span>
      <span className="text-[9px] font-medium uppercase tracking-wide">
        {request ? STATUS_HINT[request.status] : "off?"}
      </span>
    </button>
  );
}

/**
 * Live "regular days off" requester. A staff member taps a weekday to request
 * it off every week; managers approve or decline in the staff profile. Renders
 * only for a live staff session — demo sessions get an honest note instead of a
 * fake control.
 */
export function PortalRecurringDaysOffCard() {
  const state = usePortalRecurringDaysOff();
  const [note, setNote] = React.useState("");
  const [actionError, setActionError] = React.useState("");

  if (!state.enabled) {
    return (
      <DashboardCard className="p-5">
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Regular days off
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Sign in to your workspace portal to ask for a standing day off each week.
        </p>
      </DashboardCard>
    );
  }

  const cells = buildWeekdayCells(state.requests);
  const declined = state.requests.filter((request) => request.status === "declined");

  const toggle = async (cell: WeekdayCell) => {
    setActionError("");
    const trimmed = note.trim();
    const result = cell.request
      ? await state.withdraw(cell.weekday)
      : await state.request(cell.weekday, trimmed.length > 0 ? trimmed : null);
    if (!result.ok) {
      setActionError(result.message);
      toast.error("Couldn't update", { description: result.message });
      return;
    }
    if (!cell.request) setNote("");
    toast.success(
      cell.request ? `${cell.label} request withdrawn` : `${cell.label} off requested`,
      {
        description: cell.request ? undefined : "Your manager will review it.",
      },
    );
  };

  return (
    <DashboardCard className="p-5">
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Regular days off
        </div>
        {state.isError && (
          <span role="alert" className="text-[11px] text-danger">
            Couldn&apos;t load
          </span>
        )}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Tap a day you can&apos;t work each week. Your manager approves it, and approved days show
        when they plan the rota.
      </p>

      <label htmlFor="recurring-days-off-note" className="sr-only">
        Optional reason for a regular day-off request
      </label>
      <input
        id="recurring-days-off-note"
        value={note}
        onChange={(event) => {
          setNote(event.target.value);
          setActionError("");
        }}
        placeholder="Optional reason (e.g. college on Thursdays)"
        maxLength={500}
        aria-invalid={Boolean(actionError)}
        aria-describedby={actionError ? "recurring-days-off-error" : undefined}
        className="mt-3 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
      />

      <fieldset className="mt-3 grid grid-cols-7 gap-1.5">
        <legend className="sr-only">Choose regular days off</legend>
        {cells.map((cell) => (
          <WeekdayButton
            key={cell.weekday}
            cell={cell}
            disabled={state.isSaving || state.isLoading}
            describedBy={actionError ? "recurring-days-off-error" : undefined}
            onToggle={(target) => void toggle(target)}
          />
        ))}
      </fieldset>

      {actionError && (
        <p id="recurring-days-off-error" role="alert" className="mt-3 text-xs text-danger">
          {actionError}
        </p>
      )}

      {declined.map((request) => (
        <p key={request.requestId} className="mt-2 text-[11px] text-muted-foreground">
          <span className="font-semibold text-danger">Declined</span>
          {request.decisionNote ? ` — ${request.decisionNote}` : ""}
        </p>
      ))}
    </DashboardCard>
  );
}
