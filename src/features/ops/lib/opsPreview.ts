import { toast } from "sonner";

/**
 * Ops is a preview/sample surface — it is not wired to live rota, staff, leave,
 * or any backend. These helpers keep its copy honest: no surface may claim that
 * an action saved, delivered, exported, queued, pinned, or wrote an audit log.
 */

export const OPS_PREVIEW_BANNER_TITLE = "Preview — Ops isn't live yet";

export const OPS_PREVIEW_BANNER_DESCRIPTION =
  "Entries, metrics, coverage, briefings, and risks shown here are sample data. " +
  "Nothing is saved, delivered, or connected to live rota, staff, or leave.";

export const OPS_PREVIEW_TOAST_TITLE = "Preview only";

/** Honest copy for an Ops action that is not yet wired to a backend. */
export function opsPreviewMessage(action?: string): string {
  return action
    ? `${action} isn't available in this Ops preview yet.`
    : "This isn't available in the Ops preview yet.";
}

/** Fire an honest "preview only" toast for an unsupported Ops action. */
export function notifyOpsPreview(action?: string): void {
  toast.info(OPS_PREVIEW_TOAST_TITLE, { description: opsPreviewMessage(action) });
}

/**
 * Copy for an Ops interaction that only changes what is on screen.
 *
 * These interactions are real in the sense that the preview updates, but nothing
 * is written anywhere. The wording must therefore never read as persistence —
 * no "logged", "saved", "added to the timeline", "closed out" or "deleted".
 * `opsPreview.test.ts` locks that.
 */
export const OPS_LOCAL_ONLY_SUFFIX = "Preview only — nothing is saved.";

export function opsLocalChangeMessage(detail: string): string {
  return `${detail}. ${OPS_LOCAL_ONLY_SUFFIX}`;
}
