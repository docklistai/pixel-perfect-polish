import type { HardExclusion } from "./hardExclusion";

/**
 * Manager-facing wording for eligibility outcomes.
 *
 * Separated from the eligibility rules themselves so the rules file stays a
 * decision engine: changing how a refusal reads must never require touching the
 * code that decides whether to refuse.
 */

export const HARD_EXCLUSION_LABEL: Record<HardExclusion, string> = {
  "role-mismatch": "does not hold this role",
  inactive: "is no longer active",
  "approved-leave": "is on approved leave",
  "pending-leave": "has a pending leave request",
  "recurring-day-off": "has an approved recurring day off",
  "one-off-unavailable": "is marked unavailable",
  "interval-conflict": "is already working an overlapping shift",
  "unreadable-times": "has a shift whose times cannot be read",
};

/** Manager-facing summary of why an open shift could not be filled. */
export function describeExclusionCounts(
  roleKey: string,
  candidateCount: number,
  counts: ReadonlyMap<HardExclusion, number>,
): string {
  if (candidateCount === 0) return `No active staff hold the ${roleKey} role.`;
  const parts = [...counts.entries()]
    .filter(([, count]) => count > 0)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([kind, count]) => `${count} ${HARD_EXCLUSION_LABEL[kind]}`);
  if (parts.length === 0) return `No ${roleKey} colleague is free for this shift.`;
  return `All ${candidateCount} ${roleKey} staff are unavailable — ${parts.join(", ")}.`;
}
