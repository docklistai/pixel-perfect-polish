import { AlertTriangle, Ban, Info } from "lucide-react";
import {
  BULK_CONFIRM_THRESHOLD,
  bulkNeedsConfirmation,
  bulkPlanHeadline,
} from "./rotaBulkConfirmation";
import type { RotaBulkPlan } from "./rotaBulkPlan";

/**
 * What the operation would do, before it does any of it. Blocking errors are
 * listed first and named to their exact cell — one of them is enough to stop the
 * whole apply, so the manager needs to see which cell to fix.
 */
export function RotaBulkPlanSummary({ plan }: { plan: RotaBulkPlan }) {
  const warnings = plan.cells
    .filter((cell) => cell.warnings.length > 0)
    .map((cell) => ({ label: cell.label, warnings: cell.warnings }));

  return (
    <div className="space-y-4">
      {plan.blockers.length > 0 && (
        <section aria-labelledby="bulk-blockers">
          <h3
            id="bulk-blockers"
            className="flex items-center gap-1.5 text-xs font-semibold text-danger"
          >
            <Ban className="h-3.5 w-3.5" aria-hidden />
            Nothing will be applied — {plan.blockers.length}{" "}
            {plan.blockers.length === 1 ? "cell blocks" : "cells block"} this
          </h3>
          <ul className="mt-2 space-y-1.5">
            {plan.blockers.map((blocker, index) => (
              <li
                key={`${blocker.label}-${index}`}
                className="rounded-lg border border-danger/30 bg-danger-soft/30 px-2.5 py-2 text-[11px]"
              >
                <span className="font-semibold">{blocker.label}</span>
                <span className="block text-muted-foreground">{blocker.message}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {plan.blockers.length === 0 && (
        <section aria-labelledby="bulk-changes">
          <h3 id="bulk-changes" className="text-xs font-semibold">
            Planned changes
          </h3>
          <p className="mt-1 font-mono text-[11px] tabular-nums text-muted-foreground">
            {bulkPlanHeadline(plan)}
          </p>
          {bulkNeedsConfirmation(plan) && (
            <p className="mt-1.5 text-[11px] font-medium text-warning-700">
              This is a large change — more than {BULK_CONFIRM_THRESHOLD} cells or shifts. Check the
              details before confirming.
            </p>
          )}
        </section>
      )}

      {warnings.length > 0 && (
        <section aria-labelledby="bulk-warnings">
          <h3
            id="bulk-warnings"
            className="flex items-center gap-1.5 text-xs font-semibold text-warning-700"
          >
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
            Worth checking ({warnings.length})
          </h3>
          <ul className="mt-2 max-h-40 space-y-1.5 overflow-y-auto">
            {warnings.map((entry) => (
              <li
                key={entry.label}
                className="rounded-lg border border-border bg-warning-soft/20 px-2.5 py-1.5 text-[11px]"
              >
                <span className="font-semibold">{entry.label}</span>
                <span className="block text-muted-foreground">{entry.warnings.join(" · ")}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {plan.notes.length > 0 && (
        <section aria-labelledby="bulk-notes">
          <h3
            id="bulk-notes"
            className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"
          >
            <Info className="h-3.5 w-3.5" aria-hidden />
            What this does
          </h3>
          <ul className="mt-2 space-y-1 text-[11px] text-muted-foreground">
            {plan.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
