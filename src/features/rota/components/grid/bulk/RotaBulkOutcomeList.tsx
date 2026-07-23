import { Check, CircleAlert, MinusCircle } from "lucide-react";
import { describeRotaBulkOutcome, type RotaBulkOutcome } from "./runRotaBulkPlan";

const STATUS = {
  applied: { icon: Check, tone: "text-success", label: "Applied" },
  failed: { icon: CircleAlert, tone: "text-danger", label: "Failed" },
  "not-attempted": { icon: MinusCircle, tone: "text-muted-foreground", label: "Not attempted" },
} as const;

/**
 * The result ledger, cell by cell.
 *
 * Applied cells stay applied — there is no rollback to describe — so the list
 * says plainly which cells landed, which one failed, and which were never
 * reached once the run stopped.
 */
export function RotaBulkOutcomeList({ outcome }: { outcome: RotaBulkOutcome }) {
  const partial = outcome.failedCells + outcome.notAttemptedCells > 0;

  return (
    <div className="space-y-3">
      <p
        className={`text-xs font-semibold ${partial || outcome.aborted ? "text-warning-700" : "text-success"}`}
        role="status"
      >
        {describeRotaBulkOutcome(outcome)}
      </p>

      {outcome.refreshError && (
        <p className="rounded-lg border border-warning/30 bg-warning-soft/40 p-2 text-[11px] text-warning-700">
          Changes were written, but the refreshed rota could not be loaded. The visible grid may be
          out of date. Refresh the rota before making another change.
        </p>
      )}

      {partial && (
        <p className="text-[11px] text-muted-foreground">
          Cells that were applied stay applied. Nothing was rolled back, and this cannot be undone
          in one step — use Retry failed to finish the rest.
        </p>
      )}

      {outcome.outcomes.length > 0 && (
        <ul className="max-h-52 space-y-1 overflow-y-auto">
          {outcome.outcomes.map((entry) => {
            const status = STATUS[entry.status];
            const Icon = status.icon;
            return (
              <li
                key={`${entry.key.row}#${entry.key.day}`}
                className="flex items-start gap-2 rounded-lg border border-border px-2.5 py-1.5 text-[11px]"
              >
                <Icon className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${status.tone}`} aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="font-semibold">{entry.label}</span>
                  <span className="sr-only"> — {status.label}</span>
                  {entry.error && (
                    <span className="block text-muted-foreground">{entry.error}</span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
