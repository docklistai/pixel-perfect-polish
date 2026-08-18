/**
 * Instant → local-time formatting and local-date membership for Time Pulse.
 *
 * Split from the derivation rules so both stay inside their size budget and so
 * the timezone handling has one home. Every function takes an absolute instant
 * and an IANA zone: no local-midnight instant is ever constructed, because it
 * is ambiguous (or non-existent) on DST transition days.
 */

export function formatClockTime(iso: string, timezone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

/** The calendar date at `timezone` for a given instant, as `YYYY-MM-DD`. */
export function localDateOf(instant: Date | string, timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant instanceof Date ? instant : new Date(instant));
}

/** True when `instant` falls on `localDate` in `timezone`. */
export function isOnLocalDate(instant: string, localDate: string, timezone: string): boolean {
  return localDateOf(instant, timezone) === localDate;
}

/**
 * A shift belongs to the board when either end touches the location's local
 * today, so a shift that began yesterday evening and runs past midnight stays
 * visible while it is still being worked.
 */
export function shiftTouchesLocalDate(
  shift: { startsAt: string; endsAt: string; timezone: string },
  localDate: string,
): boolean {
  return (
    isOnLocalDate(shift.startsAt, localDate, shift.timezone) ||
    isOnLocalDate(shift.endsAt, localDate, shift.timezone)
  );
}
