import * as React from "react";
import { Check, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";
import { ActionButton, StatusBadge, type Tone } from "@/components/dl";
import type {
  DecideOneOffUnavailabilityInput,
  ManagerOneOffUnavailability,
} from "../../api/oneOffUnavailability";
import { useStaffOneOffUnavailability } from "../../hooks/useStaffOneOffUnavailability";
import { ProfileCard } from "./ProfileCard";

const STATUS: Record<ManagerOneOffUnavailability["status"], { label: string; tone: Tone }> = {
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
  disabled,
  onDecide,
}: {
  request: ManagerOneOffUnavailability;
  disabled: boolean;
  onDecide: (input: DecideOneOffUnavailabilityInput) => Promise<boolean>;
}) {
  const [note, setNote] = React.useState("");
  const decide = async (status: DecideOneOffUnavailabilityInput["status"]) => {
    const saved = await onDecide({ requestId: request.id, status, note: note.trim() || null });
    if (saved) setNote("");
  };
  return (
    <li className="rounded-xl border border-border px-3 py-2.5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-semibold">
            {dateLabel(request.date)}
            <StatusBadge tone={STATUS[request.status].tone}>
              {STATUS[request.status].label}
            </StatusBadge>
          </div>
          {request.note && <p className="mt-1 text-xs text-muted-foreground">{request.note}</p>}
          {request.decisionNote && <p className="mt-1 text-xs">Note: {request.decisionNote}</p>}
        </div>
      </div>
      {request.status === "pending" ? (
        <div className="mt-2 grid gap-2">
          <label className="grid gap-1 text-[11px] font-medium">
            Decision note <span className="font-normal text-muted-foreground">(optional)</span>
            <input
              value={note}
              maxLength={500}
              onChange={(event) => setNote(event.target.value)}
              className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs"
            />
          </label>
          <div className="flex gap-2">
            <ActionButton
              size="sm"
              icon={Check}
              disabled={disabled}
              onClick={() => void decide("approved")}
            >
              Approve
            </ActionButton>
            <ActionButton
              size="sm"
              variant="secondary"
              icon={X}
              disabled={disabled}
              onClick={() => void decide("declined")}
            >
              Decline
            </ActionButton>
          </div>
        </div>
      ) : request.status === "approved" || request.status === "declined" ? (
        <ActionButton
          className="mt-2"
          size="sm"
          variant="secondary"
          icon={RotateCcw}
          disabled={disabled}
          onClick={() => void decide("pending")}
        >
          Reopen
        </ActionButton>
      ) : null}
    </li>
  );
}

export function StaffOneOffUnavailabilityCard({
  staffMemberId,
  firstName,
}: {
  staffMemberId: string;
  firstName: string;
}) {
  const state = useStaffOneOffUnavailability();
  const requests = state.requests.filter((request) => request.staffMemberId === staffMemberId);
  if (!state.enabled || (!state.isLoading && !state.isError && requests.length === 0)) return null;
  const decide = async (input: DecideOneOffUnavailabilityInput): Promise<boolean> => {
    const result = await state.decide(input);
    if (!result.ok) {
      toast.error("Decision not saved", { description: result.message });
      return false;
    }
    toast.success(input.status === "pending" ? "Request reopened" : "Request " + input.status);
    return true;
  };
  return (
    <ProfileCard title="One-off unavailability">
      <p className="mb-3 text-xs text-muted-foreground">
        {firstName}&apos;s date-specific scheduling constraints. Pending requests do not affect
        eligibility; approved dates create rota warnings.
      </p>
      {state.isLoading ? (
        <p role="status" className="text-xs text-muted-foreground">
          Loading unavailability requests...
        </p>
      ) : state.isError ? (
        <div role="alert" className="text-xs text-danger">
          Requests could not be loaded.{" "}
          <button type="button" onClick={state.retry} className="font-semibold underline">
            Try again
          </button>
        </div>
      ) : (
        <ul className="space-y-2">
          {requests.map((request) => (
            <RequestRow
              key={request.id}
              request={request}
              disabled={state.isDeciding}
              onDecide={decide}
            />
          ))}
        </ul>
      )}
    </ProfileCard>
  );
}
