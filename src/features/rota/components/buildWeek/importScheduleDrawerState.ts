import type { ImportScheduleResult } from "../../api/importScheduleProposal";
import type { ImportedShiftRow } from "@/features/scheduling/parsing/headedScheduleImport";
import type { ApplyBuildWeekProposalInput } from "../../api/applyBuildWeekProposal";
import type { ServerActionAvailability } from "../../lib/serverActionAvailability";

/**
 * The Import a schedule drawer, as a pure state machine.
 *
 * The drawer itself renders; every decision it makes lives here. That is what
 * makes the rules testable without a DOM: which button is enabled, what survives
 * a failed import, and — the one that matters most — that the plan sent to apply
 * is byte-for-byte the plan the manager reviewed.
 *
 * The invariant this file exists to protect: **a failed apply never discards the
 * reviewed preview.** A manager whose import was refused still has the rows,
 * the diagnostics and the reason in front of them; they have not been dropped
 * back to an empty textarea with an error message and no idea what was wrong.
 */

export type DateOrder = "iso" | "day-first" | "month-first";

export const DATE_ORDERS: { value: DateOrder; label: string }[] = [
  { value: "day-first", label: "03/08/2026 (day first)" },
  { value: "month-first", label: "08/03/2026 (month first)" },
  { value: "iso", label: "2026-08-03 (year first)" },
];

/**
 * Day first, because this is a UK product and 03/08/2026 is 3 August here.
 *
 * The default only decides how a *numeric* date is read. An explicit ISO date is
 * always accepted whatever is selected, so a paste that already writes
 * 2026-08-03 is unaffected by this choice.
 */
export const DEFAULT_DATE_ORDER: DateOrder = "day-first";

export type ImportDrawerState = {
  text: string;
  dateOrder: DateOrder;
  result: ImportScheduleResult | null;
  busy: boolean;
  error: string | null;
};

export type ImportDrawerEvent =
  | { type: "text-changed"; text: string }
  | { type: "date-order-changed"; dateOrder: DateOrder }
  | { type: "preview-started" }
  | { type: "preview-returned"; result: ImportScheduleResult }
  | { type: "preview-threw" }
  | { type: "apply-started" }
  | { type: "apply-refused"; message: string }
  | { type: "apply-threw" }
  | { type: "closed" };

export const PREVIEW_FAILURE_MESSAGE =
  "That schedule could not be read, so nothing was previewed. Your paste is still here — check the header row and the date format, then preview again.";
export const APPLY_FAILURE_MESSAGE =
  "The import did not reach your rota. No week and no shifts were created, and your reviewed rows are still below — press Import to draft to try again.";

export function initialImportDrawerState(
  dateOrder: DateOrder = DEFAULT_DATE_ORDER,
): ImportDrawerState {
  return { text: "", dateOrder, result: null, busy: false, error: null };
}

export function importDrawerReducer(
  state: ImportDrawerState,
  event: ImportDrawerEvent,
): ImportDrawerState {
  switch (event.type) {
    case "text-changed":
      return { ...state, text: event.text };
    case "date-order-changed":
      return { ...state, dateOrder: event.dateOrder };
    case "preview-started":
      return { ...state, busy: true, error: null };
    case "preview-returned":
      // The preview is kept whether or not it succeeded: a refusal still carries
      // the per-row diagnostics the manager needs in order to fix the paste.
      return {
        ...state,
        busy: false,
        result: event.result,
        error: event.result.ok ? null : event.result.message,
      };
    case "preview-threw":
      return { ...state, busy: false, error: PREVIEW_FAILURE_MESSAGE };
    case "apply-started":
      return { ...state, busy: true, error: null };
    case "apply-refused":
      // `result` deliberately survives — see the invariant above.
      return { ...state, busy: false, error: event.message };
    case "apply-threw":
      return { ...state, busy: false, error: APPLY_FAILURE_MESSAGE };
    case "closed":
      // The declared date order is a preference, not import state, so it is the
      // one thing that survives a close.
      return initialImportDrawerState(state.dateOrder);
  }
}

/**
 * Preview needs an action that can reach the server, something pasted, and no
 * request already running.
 *
 * Availability is a required argument rather than a check the drawer remembers
 * to make: both server calls are made behind these two functions, so a rota that
 * cannot be imported into has no path to one.
 */
export function canPreview(
  state: ImportDrawerState,
  availability: ServerActionAvailability,
): boolean {
  return availability.available && state.text.trim().length > 0 && !state.busy;
}

/**
 * Apply needs a preview that succeeded and has at least one operation.
 *
 * A preview that came back with blocking row errors is `ok: false`, so this is
 * false — the confirmation is disabled while anything is blocked, rather than
 * enabled and refused later.
 */
export function canApply(
  state: ImportDrawerState,
  availability: ServerActionAvailability,
): boolean {
  return Boolean(
    availability.available && state.result?.ok && state.result.operations.length > 0 && !state.busy,
  );
}

export function previewRows(state: ImportDrawerState): ImportedShiftRow[] {
  return state.result?.preview?.rows ?? [];
}

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

/**
 * The exact payload the apply call is made with.
 *
 * Everything is echoed from the issued proposal. The operations array is passed
 * by reference and the source object is the one the database stamped, because
 * the RPC re-derives the fingerprint over that source and the digest over those
 * operations — anything reassembled here would be refused.
 */
export function applyRequestFor(
  result: Extract<ImportScheduleResult, { ok: true }>,
): ApplyBuildWeekProposalInput {
  return {
    rotaWeekId: result.rotaWeekId,
    // Carried whether or not the week exists. When it does not, these are the
    // coordinates the apply creates it at; when it does, they are ignored.
    locationId: result.locationId,
    weekStart: result.weekStart,
    inputFingerprint: result.inputFingerprint,
    proposalDigest: result.proposalDigest,
    source: result.applySource,
    operations: result.operations,
  };
}
