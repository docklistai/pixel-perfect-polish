/**
 * Canonical leave vocabulary for Docklist.
 *
 * Locked product mapping (DOCKLIST_PRODUCT_CONSTITUTION.md §5.1, §5.2):
 * - annual_leave → "Annual leave"
 * - sick         → "Sickness"
 * - personal     → "Compassionate leave"  (storage key remains "personal", no DB migration)
 * - unpaid       → "Unpaid leave"
 * - other        → "Other"               (manager-recorded absence only)
 */

export const CANONICAL_LEAVE_TYPES = [
  "annual_leave",
  "sick",
  "personal",
  "unpaid",
  "other",
] as const;

export type LeaveTypeKey = (typeof CANONICAL_LEAVE_TYPES)[number];

export const CANONICAL_LEAVE_TYPE_LABELS: Record<LeaveTypeKey, string> = {
  annual_leave: "Annual leave",
  sick: "Sickness",
  personal: "Compassionate leave",
  unpaid: "Unpaid leave",
  other: "Other",
};

/**
 * Returns the canonical display label for a leave type key or string.
 * Falls back to "Leave" if nullish.
 */
export function formatLeaveType(key: string | null | undefined): string {
  if (!key) return "Leave";
  if (key in CANONICAL_LEAVE_TYPE_LABELS) {
    return CANONICAL_LEAVE_TYPE_LABELS[key as LeaveTypeKey];
  }
  return key;
}
