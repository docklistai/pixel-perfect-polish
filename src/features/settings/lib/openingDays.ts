/**
 * Opening-days helpers. The workspace stores a 7-bit mask (bit 0 = Monday ..
 * bit 6 = Sunday); a set bit means the business is open that weekday. Null means
 * "not configured" and is treated as open every day.
 */

export const WEEKDAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export const WEEKDAY_FULL = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

/** Seven booleans, Mon..Sun. Null mask = open every day. */
export function maskToOpenDays(mask: number | null): boolean[] {
  if (mask === null) return [true, true, true, true, true, true, true];
  return Array.from({ length: 7 }, (_, i) => (mask & (1 << i)) !== 0);
}

export function openDaysToMask(days: boolean[]): number {
  return days.reduce((mask, open, i) => (open ? mask | (1 << i) : mask), 0);
}

/** True when the business is open on weekday (0 = Mon .. 6 = Sun). */
export function isOpenOnWeekday(mask: number | null, weekday: number): boolean {
  if (mask === null) return true;
  return (mask & (1 << weekday)) !== 0;
}
