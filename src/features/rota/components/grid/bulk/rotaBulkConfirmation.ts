import type { RotaBulkKind, RotaBulkPlan } from "./rotaBulkPlan";

/** Above this, a bulk change is large enough to deserve a deliberate second look. */
export const BULK_CONFIRM_THRESHOLD = 10;

/**
 * Cells and shifts are counted separately on purpose: one cell can hold a split
 * shift, so twelve cells can be twenty writes. Either count crossing the
 * threshold is enough to ask.
 */
export function bulkNeedsConfirmation(plan: RotaBulkPlan): boolean {
  return plan.counts.cells > BULK_CONFIRM_THRESHOLD || plan.counts.shifts > BULK_CONFIRM_THRESHOLD;
}

export function bulkActionTitle(kind: RotaBulkKind): string {
  switch (kind) {
    case "clear":
      return "Clear selected cells";
    case "paste":
      return "Paste into selected cells";
    case "fill-down":
      return "Fill down";
    case "fill-right":
      return "Fill right";
  }
}

export function bulkConfirmLabel(kind: RotaBulkKind): string {
  return kind === "clear" ? "Clear cells" : "Apply changes";
}

/** One line naming exactly what is about to change. */
export function bulkPlanHeadline(plan: RotaBulkPlan): string {
  const { cells, created, updated, cleared } = plan.counts;
  const parts: string[] = [];
  if (created > 0) parts.push(`${created} created`);
  if (updated > 0) parts.push(`${updated} updated`);
  if (cleared > 0) parts.push(`${cleared} cleared`);
  const cellLabel = `${cells} ${cells === 1 ? "cell" : "cells"}`;
  if (parts.length === 0) return `${cellLabel}. No shifts change.`;
  return `${cellLabel}: ${parts.join(", ")}.`;
}
