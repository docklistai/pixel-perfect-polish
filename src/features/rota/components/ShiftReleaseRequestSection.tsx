import * as React from "react";
import { toast } from "sonner";
import { ActionButton, FormSection, StatusBadge } from "@/components/dl";
import { shiftReleaseStatusPresentation } from "@/features/staff-portal/lib/shiftReleaseRequests";
import type { ManagerShiftReleaseRequest } from "../api/shiftReleaseRequests";
import { useShiftReleaseRequests } from "../hooks/useShiftReleaseRequests";

function PendingDecision({
  request,
  disabled,
  onApprove,
  onDecline,
}: {
  request: ManagerShiftReleaseRequest;
  disabled: boolean;
  onApprove: (requestId: string, note: string | null) => void;
  onDecline: (requestId: string, note: string | null) => void;
}) {
  const [note, setNote] = React.useState("");
  return (
    <div className="mt-2 grid gap-2">
      <label className="grid gap-1 text-[11px] font-medium">
        Decision note <span className="font-normal text-muted-foreground">(optional)</span>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={2000}
          rows={2}
          className="resize-none rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs"
        />
      </label>
      <div className="flex gap-2">
        <ActionButton
          size="sm"
          disabled={disabled}
          onClick={() => onApprove(request.requestId, note.trim() || null)}
        >
          Approve and reopen draft
        </ActionButton>
        <ActionButton
          size="sm"
          variant="secondary"
          disabled={disabled}
          onClick={() => onDecline(request.requestId, note.trim() || null)}
        >
          Decline
        </ActionButton>
      </div>
    </div>
  );
}

export function ShiftReleaseRequestSection({
  rotaWeekId,
  sourceShiftId,
}: {
  rotaWeekId: string;
  sourceShiftId: string;
}) {
  const state = useShiftReleaseRequests(rotaWeekId);
  const requests = state.requestsFor(sourceShiftId);
  if (!state.enabled || (!state.isLoading && !state.isError && requests.length === 0)) return null;

  const decide = async (kind: "approve" | "decline", requestId: string, note: string | null) => {
    const result = await state[kind]({ requestId, note });
    if (!result.ok) {
      toast.error("Decision not saved", { description: result.message });
      return;
    }
    toast.success(kind === "approve" ? "Release approved" : "Release declined", {
      description:
        kind === "approve"
          ? "The draft shift is open. Assign a recovery candidate or leave it open, then republish."
          : "The staff member has been notified.",
    });
  };

  return (
    <FormSection title="Release request">
      {state.isLoading && <p className="text-xs text-muted-foreground">Loading request…</p>}
      {state.isError && (
        <div role="alert" className="text-xs text-danger">
          Release requests could not be loaded.{" "}
          <button type="button" className="font-semibold underline" onClick={state.retry}>
            Try again
          </button>
        </div>
      )}
      <ul className="space-y-2">
        {requests.map((request) => {
          const status = shiftReleaseStatusPresentation(request.status);
          return (
            <li key={request.requestId} className="rounded-xl border border-border p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">{request.staffName}</p>
                  <p className="text-xs text-muted-foreground">
                    Published shift: {request.dayLabel} · {request.start} – {request.end} ·{" "}
                    {request.locationName}
                  </p>
                </div>
                <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
              </div>
              <p className="mt-2 text-xs">
                <span className="font-medium">Reason:</span> {request.reason}
              </p>
              {request.decisionReason && (
                <p className="mt-1 text-xs">
                  <span className="font-medium">Decision note:</span> {request.decisionReason}
                </p>
              )}
              {request.status === "pending" && (
                <PendingDecision
                  request={request}
                  disabled={state.isDeciding}
                  onApprove={(id, note) => void decide("approve", id, note)}
                  onDecline={(id, note) => void decide("decline", id, note)}
                />
              )}
              {request.status === "approved" && (
                <p className="mt-2 text-[11px] font-medium text-warning">
                  The draft is reopened, but the published snapshot still assigns this person until
                  you republish.
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </FormSection>
  );
}
