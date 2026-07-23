import { ListChecks } from "lucide-react";
import { ActionButton, DialogShell } from "@/components/dl";
import { RotaBulkPlanSummary } from "./RotaBulkPlanSummary";
import { RotaBulkOutcomeList } from "./RotaBulkOutcomeList";
import { bulkActionTitle, bulkConfirmLabel } from "./rotaBulkConfirmation";
import { planIsApplicable, type RotaBulkPlan } from "./rotaBulkPlan";
import type { RotaBulkOutcome } from "./runRotaBulkPlan";

/**
 * The single confirmation surface for clear, paste and fill.
 *
 * It has two states and never blurs them: before confirming it shows what would
 * change and what blocks it, and afterwards it shows what actually happened.
 * Nothing is written until the manager confirms, and the result is never
 * summarised as success when part of it failed.
 */
export function RotaBulkPreviewDialog({
  open,
  plan,
  outcome,
  running,
  onOpenChange,
  onConfirm,
  onRetryFailed,
  onRefresh,
}: {
  open: boolean;
  plan: RotaBulkPlan | null;
  /** Present once a run has finished; the dialog then shows the ledger. */
  outcome: RotaBulkOutcome | null;
  running: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  onRetryFailed: () => void;
  onRefresh: () => void;
}) {
  if (!plan) return null;

  const applicable = planIsApplicable(plan);
  const canRetry =
    outcome !== null && !outcome.aborted && outcome.failedCells + outcome.notAttemptedCells > 0;

  const footer = outcome ? (
    <>
      {outcome.refreshError && (
        <ActionButton variant="primary" size="sm" onClick={onRefresh} disabled={running}>
          {running ? "Refreshing…" : "Refresh rota"}
        </ActionButton>
      )}
      {canRetry && (
        <ActionButton variant="primary" size="sm" onClick={onRetryFailed} disabled={running}>
          {running ? "Retrying…" : "Retry failed"}
        </ActionButton>
      )}
      <ActionButton variant="secondary" size="sm" onClick={() => onOpenChange(false)}>
        Close
      </ActionButton>
    </>
  ) : (
    <>
      <ActionButton variant="secondary" size="sm" onClick={() => onOpenChange(false)}>
        Cancel
      </ActionButton>
      <ActionButton
        variant={plan.kind === "clear" ? "danger" : "primary"}
        size="sm"
        onClick={onConfirm}
        disabled={!applicable || running}
      >
        {running ? "Applying…" : bulkConfirmLabel(plan.kind)}
      </ActionButton>
    </>
  );

  return (
    <DialogShell
      open={open}
      onOpenChange={onOpenChange}
      title={bulkActionTitle(plan.kind)}
      description={
        outcome
          ? "Result of this bulk change, cell by cell."
          : "Review these changes. Nothing is saved until you confirm."
      }
      icon={ListChecks}
      iconTone={plan.kind === "clear" ? "danger" : "brand"}
      size="md"
      footer={footer}
    >
      {outcome ? <RotaBulkOutcomeList outcome={outcome} /> : <RotaBulkPlanSummary plan={plan} />}
    </DialogShell>
  );
}
