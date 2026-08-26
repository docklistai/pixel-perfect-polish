/**
 * Leave-year resolution.
 *
 * A workspace states the MONTH its leave year begins; the year always starts on
 * the 1st of that month. From that single number plus a reference date this
 * module resolves the concrete window, which is what everything downstream
 * keys on — `staff_leave_entitlements.leave_year_start` stores the resolved
 * start date, not an integer year, so a historical row stays self-describing
 * even if the workspace later moves its leave-year start.
 *
 * All arithmetic is UTC. Local-time `Date` construction would let a DST
 * transition shift a date across midnight and silently move a leave year by one
 * day, which is the kind of quiet wrongness this feature cannot afford.
 */

/** Inclusive ISO bounds (YYYY-MM-DD) of one leave year. */
export interface LeaveYearWindow {
  startIso: string;
  endIso: string;
}

const MONTH_LABELS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

/** Month options for the workspace leave-year control. 1 = January. */
export const LEAVE_YEAR_MONTH_OPTIONS: ReadonlyArray<{ value: number; label: string }> =
  MONTH_LABELS.map((label, index) => ({ value: index + 1, label }));

/**
 * True when `month` is a usable leave-year start month. Anything else —
 * null, 0, 13, a fraction, NaN — means the workspace has not configured a
 * leave year and every balance surface stays in its unconfigured state.
 */
export function isValidLeaveYearMonth(month: number | null | undefined): month is number {
  return typeof month === "number" && Number.isInteger(month) && month >= 1 && month <= 12;
}

function isoParts(iso: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
}

function toIso(utcMs: number): string {
  return new Date(utcMs).toISOString().slice(0, 10);
}

/**
 * The leave year containing `referenceIso` for a workspace whose leave year
 * starts on the 1st of `startMonth`.
 *
 * A reference date on or after the start month belongs to the year that began
 * this calendar year; a date before it belongs to the year that began last
 * calendar year. Returns null when the policy or the reference date is not
 * usable, so callers surface "not configured" rather than guessing.
 */
export function resolveLeaveYear(
  referenceIso: string,
  startMonth: number | null | undefined,
): LeaveYearWindow | null {
  if (!isValidLeaveYearMonth(startMonth)) return null;
  const parts = isoParts(referenceIso);
  if (!parts) return null;

  const startYear = parts.month >= startMonth ? parts.year : parts.year - 1;
  const startMs = Date.UTC(startYear, startMonth - 1, 1);
  // One day before the same month next year. Date.UTC normalises the rollover,
  // so a February start lands on 28 or 29 February without a leap-year branch.
  const endMs = Date.UTC(startYear + 1, startMonth - 1, 1) - 86_400_000;

  return { startIso: toIso(startMs), endIso: toIso(endMs) };
}

/**
 * The leave year `offset` years away from `window` (1 = next, -1 = previous).
 * Derived from the window's own start so it stays correct for any start month.
 */
export function shiftLeaveYear(window: LeaveYearWindow, offset: number): LeaveYearWindow | null {
  const parts = isoParts(window.startIso);
  if (!parts) return null;
  const startMs = Date.UTC(parts.year + offset, parts.month - 1, 1);
  const endMs = Date.UTC(parts.year + offset + 1, parts.month - 1, 1) - 86_400_000;
  return { startIso: toIso(startMs), endIso: toIso(endMs) };
}

/**
 * The window a stored `staff_leave_entitlements.leave_year_start` describes.
 *
 * This is what lets the staff portal resolve its own leave year without any
 * read path into manager-only `workspace_settings`: the entitlement row already
 * carries the resolved start, and the end is one day before the same date next
 * year.
 */
export function leaveYearWindowFromStart(startIso: string): LeaveYearWindow | null {
  const parts = isoParts(startIso);
  if (!parts) return null;
  const endMs = Date.UTC(parts.year + 1, parts.month - 1, parts.day) - 86_400_000;
  return { startIso, endIso: toIso(endMs) };
}

/** True when `iso` falls inside the inclusive window. */
export function leaveYearContains(window: LeaveYearWindow, iso: string): boolean {
  return iso >= window.startIso && iso <= window.endIso;
}

/**
 * Human label for a leave year. A January start is an ordinary calendar year
 * and reads as one; any other start spans two calendar years and says so, so a
 * manager can never mistake which window a recorded entitlement belongs to.
 */
export function leaveYearLabel(window: LeaveYearWindow): string {
  const start = isoParts(window.startIso);
  const end = isoParts(window.endIso);
  if (!start || !end) return "";
  if (start.month === 1) return String(start.year);
  return `${MONTH_SHORT[start.month - 1]} ${start.year} – ${MONTH_SHORT[end.month - 1]} ${end.year}`;
}
