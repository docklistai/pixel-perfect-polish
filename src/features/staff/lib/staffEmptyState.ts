/**
 * Decides which empty state the Staff list should show. Keeps the distinction
 * between "no staff exist yet" (onboarding) and "filters hid everything"
 * (adjust filters) in one pure, testable place so the table never tells a
 * brand-new workspace to "try adjusting filters".
 */

export type StaffEmptyState = "first-staff" | "filtered" | null;

export interface StaffEmptyStateInput {
  /** Total roster size before search/filtering. */
  totalRows: number;
  /** Rows remaining after search/filtering. */
  filteredRows: number;
  query: string;
  deptFilter: string;
  statusFilter: string;
}

/** True when any search term or non-default filter is narrowing the roster. */
export function hasActiveStaffFilters(input: StaffEmptyStateInput): boolean {
  return input.query.trim() !== "" || input.deptFilter !== "All" || input.statusFilter !== "All";
}

/**
 * `null` → rows are present, render the table.
 * `"first-staff"` → genuinely empty roster with no active filters → onboarding CTA.
 * `"filtered"` → filters/search hid everything → adjust-filters message.
 */
export function resolveStaffEmptyState(input: StaffEmptyStateInput): StaffEmptyState {
  if (input.filteredRows > 0) return null;
  if (input.totalRows === 0 && !hasActiveStaffFilters(input)) return "first-staff";
  return "filtered";
}
