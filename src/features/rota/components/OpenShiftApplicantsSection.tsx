import * as React from "react";
import { ActionButton, ConfirmDialog, FormSection, StatusBadge } from "@/components/dl";
import { useOpenShiftApplicants } from "../hooks/useOpenShiftApplicants";
import type { ShiftId } from "../types";

/**
 * Applicants who requested this published open shift, reviewed inside the
 * shift drawer. Selecting assigns the DRAFT shift only; the manager must
 * republish for the assignment (and staff notifications) to land.
 */
export function OpenShiftApplicantsSection({
  rotaWeekId,
  sourceShiftId,
}: {
  rotaWeekId: string;
  sourceShiftId: ShiftId;
}) {
  const review = useOpenShiftApplicants(rotaWeekId);
  const applicants = review.applicantsFor(sourceShiftId);
  const [declineRequestId, setDeclineRequestId] = React.useState<string | null>(null);
  const hasSelectedApplicant = applicants.some((applicant) => applicant.status === "selected");

  if (!review.enabled) return null;
  if (review.isError) {
    return (
      <FormSection title="Applicants">
        <div
          role="alert"
          className="rounded-xl border border-danger/30 bg-danger-soft px-3 py-2 text-sm"
        >
          <p className="font-medium text-danger">Applicants could not be loaded</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Try again before deciding who should work this shift.
          </p>
          <ActionButton className="mt-2" variant="secondary" size="sm" onClick={review.retry}>
            Try again
          </ActionButton>
        </div>
      </FormSection>
    );
  }
  if (!review.isLoading && applicants.length === 0) return null;

  return (
    <FormSection title="Applicants">
      {review.isLoading ? (
        <p className="text-xs text-muted-foreground">Loading applicants…</p>
      ) : (
        <>
          <ul className="space-y-2">
            {applicants.map((applicant) => (
              <li
                key={applicant.requestId}
                className="flex items-center gap-2 rounded-xl border border-border/70 px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{applicant.staffName}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {applicant.staffRole}
                  </div>
                </div>
                {applicant.status === "selected" ? (
                  <StatusBadge tone="info">Selected · awaiting publish</StatusBadge>
                ) : (
                  <ActionButton
                    size="sm"
                    disabled={review.busy || hasSelectedApplicant}
                    onClick={() => review.select(applicant.requestId)}
                  >
                    Select
                  </ActionButton>
                )}
                <ActionButton
                  variant="ghost"
                  size="sm"
                  disabled={review.busy}
                  onClick={() => setDeclineRequestId(applicant.requestId)}
                >
                  Decline
                </ActionButton>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] text-muted-foreground">
            {hasSelectedApplicant
              ? "The selected applicant is assigned in the draft and is awaiting publication. Decline to undo, or republish to confirm."
              : "Selecting assigns the draft shift. Republish the rota to confirm the assignment and notify everyone affected."}
          </p>
        </>
      )}
      <ConfirmDialog
        open={declineRequestId !== null}
        onOpenChange={(open) => !open && setDeclineRequestId(null)}
        title="Decline this request?"
        description="The staff member will be notified. If they were selected, the draft shift will reopen."
        confirmLabel="Decline request"
        tone="danger"
        onConfirm={() => {
          if (declineRequestId) review.decline(declineRequestId);
          setDeclineRequestId(null);
        }}
      />
    </FormSection>
  );
}
