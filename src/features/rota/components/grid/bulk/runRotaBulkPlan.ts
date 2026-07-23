import type { DraftShift, DraftShiftInput, ShiftId } from "../../../types";
import type { RotaCellKey } from "../selection/rotaSelectionModel";
import { buildBulkPlan, type RotaBulkPlan } from "./rotaBulkPlan";

export type RotaBulkRunners = {
  addShift: (input: DraftShiftInput) => Promise<void>;
  updateShift: (shiftId: ShiftId, patch: Partial<DraftShift>) => Promise<void>;
  removeShift: (shiftId: ShiftId) => Promise<void>;
  /** Re-reads the authoritative week. Called once before and once after a run. */
  refetch: () => Promise<readonly DraftShift[] | void>;
  /** Clears stale single-operation history after the first write lands. */
  onApplied?: () => void;
};

export type RotaBulkCellOutcome = {
  key: RotaCellKey;
  label: string;
  status: "applied" | "failed" | "not-attempted";
  error?: string;
  /**
   * Writes that landed inside this cell before it failed. A cell holding a split
   * shift is several writes, so a retry has to resume rather than restart — the
   * alternative would create a duplicate of whatever already succeeded.
   */
  completedOps: number;
};

export type RotaBulkOutcome = {
  outcomes: RotaBulkCellOutcome[];
  appliedCells: number;
  failedCells: number;
  notAttemptedCells: number;
  totalCells: number;
  /** Set when the run stopped before any write, e.g. the week changed underneath. */
  aborted?: string;
  /** Writes landed, but the final authoritative view could not be loaded. */
  refreshError?: string;
};

export const DRIFT_MESSAGE =
  "This week changed while the preview was open, so nothing was applied. " +
  "Close this and try again against the current rota.";

/**
 * Plain-English result. It never claims atomicity, rollback or undo, because
 * none of those exist here: each shift is its own write against the server, so a
 * run that stops half way has genuinely half applied.
 */
export function describeRotaBulkOutcome(outcome: RotaBulkOutcome): string {
  if (outcome.aborted) return outcome.aborted;
  const cells = outcome.totalCells === 1 ? "cell" : "cells";
  if (outcome.failedCells === 0 && outcome.notAttemptedCells === 0) {
    return `${outcome.appliedCells} of ${outcome.totalCells} ${cells} updated.`;
  }
  const remaining = outcome.failedCells + outcome.notAttemptedCells;
  return `${outcome.appliedCells} of ${outcome.totalCells} ${cells} updated. ${remaining} ${remaining === 1 ? "was" : "were"} not applied.`;
}

/**
 * Applies a plan one write at a time.
 *
 * Strictly sequential: the mutation runner refuses overlapping writes, and more
 * importantly a half-failed parallel run would leave the manager unable to say
 * which cells landed. The run stops at the first failure — continuing past one
 * would multiply an unexplained error across the rest of the selection — and
 * every remaining cell is reported as not attempted rather than quietly dropped.
 *
 * There is no rollback. Cells already written stay written, and the outcome says
 * so.
 */
export async function runRotaBulkPlan(
  plan: RotaBulkPlan,
  runners: RotaBulkRunners,
  options?: {
    /**
     * Re-derives the signature from freshly fetched data, for drift detection.
     * Async so the caller can let the refetched week reach the component tree
     * before reading it back.
     */
    currentSignature?: (fresh?: readonly DraftShift[]) => string | Promise<string>;
  },
): Promise<RotaBulkOutcome> {
  const applicable = plan.cells.filter((cell) => cell.ops.length > 0);
  const empty: RotaBulkOutcome = {
    outcomes: [],
    appliedCells: 0,
    failedCells: 0,
    notAttemptedCells: 0,
    totalCells: applicable.length,
  };
  if (applicable.length === 0) return empty;

  // Read the week again before touching it, so a plan built against a stale view
  // is abandoned rather than written over somebody else's newer edit.
  const freshShifts = await runners.refetch();
  if (options?.currentSignature) {
    const fresh = await options.currentSignature(freshShifts ?? undefined);
    if (fresh !== plan.signature) return { ...empty, aborted: DRIFT_MESSAGE };
  }

  const outcomes: RotaBulkCellOutcome[] = [];
  let stopped = false;

  for (const cell of applicable) {
    if (stopped) {
      outcomes.push({ key: cell.key, label: cell.label, status: "not-attempted", completedOps: 0 });
      continue;
    }
    let completedOps = 0;
    try {
      for (const op of cell.ops) {
        if (op.kind === "create") await runners.addShift(op.input);
        else if (op.kind === "update") await runners.updateShift(op.shiftId, op.patch);
        else await runners.removeShift(op.shiftId);
        completedOps += 1;
      }
      outcomes.push({ key: cell.key, label: cell.label, status: "applied", completedOps });
    } catch (error) {
      stopped = true;
      outcomes.push({
        key: cell.key,
        label: cell.label,
        status: "failed",
        completedOps,
        error: error instanceof Error ? error.message : "The rota could not be saved.",
      });
    }
  }

  const result: RotaBulkOutcome = {
    outcomes,
    appliedCells: outcomes.filter((o) => o.status === "applied").length,
    failedCells: outcomes.filter((o) => o.status === "failed").length,
    notAttemptedCells: outcomes.filter((o) => o.status === "not-attempted").length,
    totalCells: applicable.length,
  };
  if (outcomes.some((outcome) => outcome.completedOps > 0)) runners.onApplied?.();
  try {
    await runners.refetch();
  } catch (error) {
    result.refreshError =
      error instanceof Error ? error.message : "The refreshed rota could not be loaded.";
  }
  return result;
}

/**
 * The plan needed to finish an interrupted run: the cell that failed plus every
 * cell never attempted. Applied cells are excluded so a retry cannot double-write
 * a create.
 */
export function buildRetryPlan(
  plan: RotaBulkPlan,
  outcome: RotaBulkOutcome,
  signature: string,
): RotaBulkPlan {
  const resumeFrom = new Map(
    outcome.outcomes
      .filter((o) => o.status !== "applied")
      .map((o) => [`${o.key.row}#${o.key.day}`, o.completedOps]),
  );
  const cells = plan.cells
    .filter((cell) => resumeFrom.has(`${cell.key.row}#${cell.key.day}`))
    .map((cell) => ({
      ...cell,
      ops: cell.ops.slice(resumeFrom.get(`${cell.key.row}#${cell.key.day}`) ?? 0),
    }));
  const retry = buildBulkPlan(plan.kind, cells, [], plan.notes, []);
  // Validated against the week as it stands after the partial run, not the one
  // the original plan was built from.
  return { ...retry, signature };
}
