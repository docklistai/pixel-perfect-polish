import type { LeaveBalance } from "./leaveBalance";

/**
 * Shared copy and formatting for every leave-balance surface.
 *
 * Centralised deliberately: the unit statement is a product commitment, not
 * decoration. Docklist counts calendar dates because it does not know an
 * individual's working pattern, and no surface may show a bare balance that
 * reads as working-day precision. Keeping the wording here means a balance can
 * never be rendered somewhere that quietly forgets to say so.
 */

/** Short unit label. Sits next to figures wherever space is tight. */
export const CALENDAR_DAYS_LABEL = "Calendar days";

/** Full limitation statement. Used where explanatory copy fits. */
export const CALENDAR_DAYS_EXPLAINER =
  "Docklist counts calendar dates in leave requests. It does not calculate contractual working-day entitlement.";

/** Shown wherever a person has no entitlement recorded for the leave year. */
export const NOT_RECORDED_LABEL = "Entitlement not recorded";

/** Compact variant of the same state, for dense rows. */
export const NOT_RECORDED_SHORT = "Not recorded";

function plural(count: number, word: string): string {
  return `${count} ${word}${Math.abs(count) === 1 ? "" : "s"}`;
}

/**
 * "12 booked of 28 · 16 remaining", or the unrecorded state.
 *
 * Booked is always stated even when nothing is recorded, because the days have
 * still been approved and the manager needs to see them.
 */
export function formatEntitlementSummary(balance: LeaveBalance): string {
  if (!balance.recorded) {
    return balance.booked > 0
      ? `${NOT_RECORDED_LABEL} · ${plural(balance.booked, "day")} booked`
      : NOT_RECORDED_LABEL;
  }
  return `${balance.booked} booked of ${balance.entitlementDays} · ${balance.remaining} remaining`;
}

/** "3 pending", or null when there is nothing awaiting a decision. */
export function formatPendingSummary(balance: LeaveBalance): string | null {
  if (balance.pending <= 0) return null;
  return plural(balance.pending, "day");
}

/**
 * Tone for a remaining figure.
 *
 * A negative remaining is `danger` because more leave has been approved than
 * was recorded — real information a manager should see, never something to
 * clamp away or hide.
 */
export function remainingTone(balance: LeaveBalance): "muted" | "success" | "warning" | "danger" {
  if (!balance.recorded || balance.remaining === null) return "muted";
  if (balance.remaining < 0) return "danger";
  if (balance.remaining <= 5) return "warning";
  return "success";
}
