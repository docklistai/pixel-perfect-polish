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
  onToggle,
}: {
  cell: WeekdayCell;
  disabled: boolean;
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
    const trimmed = note.trim();
    const result = cell.request
      ? await state.withdraw(cell.weekday)
      : await state.request(cell.weekday, trimmed.length > 0 ? trimmed : null);
    if (!result.ok) {
      toast.error("Couldn't update", { description: result.message });
      return;
    }
    if (!cell.request) setNote("");
    toast.success(cell.request ? `${cell.label} request withdrawn` : `${cell.label} off requested`, {
      description: cell.request ? undefined : "Your manager will review it.",
    });
  };

  return (
    <DashboardCard className="p-5">
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Regular days off
        </div>
        {state.isError && <span className="text-[11px] text-danger">Couldn&apos;t load</span>}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Tap a day you can&apos;t work each week. Your manager approves it, and approved days show
        when they plan the rota.
      </p>

      <input
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder="Optional reason (e.g. college on Thursdays)"
        maxLength={500}
        className="mt-3 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
      />

      <div className="mt-3 grid grid-cols-7 gap-1.5">
        {cells.map((cell) => (
          <WeekdayButton
            key={cell.weekday}
            cell={cell}
            disabled={state.isSaving || state.isLoading}
            onToggle={(target) => void toggle(target)}
          />
        ))}
      </div>

      {declined.map((request) => (
        <p key={request.requestId} className="mt-2 text-[11px] text-muted-foreground">
          <span className="font-semibold text-danger">Declined</span>
          {request.decisionNote ? ` — ${request.decisionNote}` : ""}
        </p>
      ))}
    </DashboardCard>
  );
}
