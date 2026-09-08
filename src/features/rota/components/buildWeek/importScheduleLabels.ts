import type { ImportDrawerState } from "./importScheduleDrawerState";

/**
 * What the import drawer says about the state it is in.
 *
 * Split out of `importScheduleDrawerState` when that file reached its size
 * limit, along the seam that was already there: the reducer decides what is
 * *true*, and these decide how to *say* it. Both are pure, both are tested, and
 * callers still import them from the state module, which re-exports them.
 */

/**
 * What this paste would write, against what an import is allowed to write.
 *
 * Read from the preview rather than from a successful proposal, so it is
 * available in exactly the case it matters most: a paste that is over the
 * ceiling and therefore has no proposal at all. A preview that says "504 of a
 * maximum 500" is the honest version of the old "504 ready" followed by a
 * refusal nobody could have predicted.
 */
export function operationCountLabel(state: ImportDrawerState): string | null {
  const preview = state.result?.preview;
  if (!preview) return null;
  if (preview.operationCount > preview.operationLimit) {
    return `${preview.operationCount} shifts — more than the ${preview.operationLimit} one import can write`;
  }
  return `${preview.operationCount} of a maximum ${preview.operationLimit} shifts`;
}

export function previewLabel(state: ImportDrawerState): string {
  return state.busy && !state.result ? "Reading…" : "Preview";
}

export function applyLabel(state: ImportDrawerState): string {
  return state.busy && state.result ? "Importing…" : "Import to draft";
}
