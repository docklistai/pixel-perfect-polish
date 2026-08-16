import { ArrowRight, CheckCircle2, MinusCircle, PlusCircle, PencilLine } from "lucide-react";
import { StatusBadge } from "@/components/dl";
import { describePublishDiffShift, type PublishDiffEntry } from "../lib/publishDiff";
import type { PublishDiffState } from "../hooks/usePublishDiff";

/**
 * "What changed since the last publication", shown inside the publish dialog.
 *
 * Presentational only. It renders the diff it is handed and routes nowhere; the
 * readiness checks, acknowledgement and publish action above and below it are
 * untouched by this block.
 */

const MAX_VISIBLE_ENTRIES = 12;

function entryTone(kind: PublishDiffEntry["kind"]) {
  if (kind === "added") return { tone: "success" as const, Icon: PlusCircle, label: "Added" };
  if (kind === "removed") return { tone: "danger" as const, Icon: MinusCircle, label: "Removed" };
  return { tone: "warning" as const, Icon: PencilLine, label: "Changed" };
}

function EntryRow({ entry, dayLabels }: { entry: PublishDiffEntry; dayLabels: readonly string[] }) {
  const { tone, Icon, label } = entryTone(entry.kind);
  const shift = entry.kind === "changed" ? entry.after : entry.shift;
  return (
    <li className="flex items-start gap-2 py-1.5">
      <Icon
        className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${
          tone === "success" ? "text-success" : tone === "danger" ? "text-danger" : "text-warning"
        }`}
        aria-hidden
      />
      <div className="min-w-0">
        <div className="text-sm">
          <span className="sr-only">{label}: </span>
          {describePublishDiffShift(shift, dayLabels)}
        </div>
        {entry.kind === "changed" && (
          <ul className="mt-0.5 flex flex-col gap-0.5">
            {entry.changes.map((change) => (
              <li
                key={change.label}
                className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground"
              >
                <span className="font-medium">{change.label}:</span>
                <span>{change.from}</span>
                <ArrowRight className="h-3 w-3" aria-hidden />
                <span className="font-medium text-foreground">{change.to}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}

export function PublishChangeReview({
  state,
  dayLabels,
}: {
  state: PublishDiffState;
  dayLabels: readonly string[];
}) {
  // Demo mode and non-manager sessions have no snapshot to compare against;
  // the dialog simply keeps its existing content in that case.
  if (state.status === "unavailable") return null;

  return (
    <div className="card mt-3 p-3" style={{ background: "var(--bg-raised)" }}>
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold">Changes since last publish</div>
        {state.status === "ready" && state.diff && !state.diff.isFirstPublish && (
          <StatusBadge tone={state.diff.isUnchanged ? "muted" : "warning"}>
            {state.diff.totals.added + state.diff.totals.removed + state.diff.totals.changed}
          </StatusBadge>
        )}
      </div>

      {state.status === "loading" && (
        <p className="mt-2 text-sm text-muted-foreground">Comparing with the published rota…</p>
      )}

      {state.status === "error" && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <p className="text-sm text-warning">
            The published rota could not be loaded, so changes cannot be listed.
          </p>
          <button
            type="button"
            onClick={state.retry}
            className="rounded-md border border-border px-2 py-1 text-xs font-semibold hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
          >
            Try again
          </button>
        </div>
      )}

      {state.status === "ready" && state.diff && (
        <>
          {state.diff.isFirstPublish ? (
            <p className="mt-2 text-sm text-muted-foreground">
              This week has not been published before, so all {state.diff.totals.added} shifts are
              new to staff.
            </p>
          ) : state.diff.isUnchanged ? (
            <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success" aria-hidden />
              No shift changes since the last publication.
            </p>
          ) : (
            <>
              <p className="mt-1 text-xs text-muted-foreground">
                {state.diff.totals.added} added · {state.diff.totals.changed} changed ·{" "}
                {state.diff.totals.removed} removed
                {state.diff.affectedStaffCount > 0 &&
                  ` · ${state.diff.affectedStaffCount} staff affected`}
              </p>
              <ul className="mt-1.5 flex flex-col divide-y divide-border">
                {state.diff.entries.slice(0, MAX_VISIBLE_ENTRIES).map((entry) => (
                  <EntryRow
                    key={`${entry.kind}-${entry.kind === "changed" ? entry.after.id : entry.shift.id}`}
                    entry={entry}
                    dayLabels={dayLabels}
                  />
                ))}
              </ul>
              {state.diff.entries.length > MAX_VISIBLE_ENTRIES && (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  and {state.diff.entries.length - MAX_VISIBLE_ENTRIES} more change
                  {state.diff.entries.length - MAX_VISIBLE_ENTRIES === 1 ? "" : "s"}.
                </p>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
