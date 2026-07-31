/**
 * The one interval engine for rota scheduling.
 *
 * Every overlap question in this feature used to be answered separately, and the
 * four answers disagreed: two treated an unreadable time as "no clash" and two as
 * "clash", and none of them compared across a date boundary at all — so a Monday
 * 22:00–02:00 shift and a Tuesday 00:00–08:00 shift never collided for the same
 * person.
 *
 * This module fixes both by reasoning in absolute minutes from a shared epoch
 * rather than minutes-from-midnight within one day index. A shift that runs past
 * midnight simply ends on the next date, which the arithmetic handles with no
 * special case at the comparison site.
 *
 * Overnight state is explicit throughout. It is derived once, here, and carried —
 * never re-inferred by a caller comparing two strings.
 */

/** Minutes in a day. Overnight shifts end at `startAbs + duration`, past this. */
const MINUTES_PER_DAY = 24 * 60;
const MS_PER_DAY = 86_400_000;

/** A local wall-clock shift, before it is placed on the calendar. */
export type LocalShiftTimes = {
  /** The local date the shift is filed under, `yyyy-mm-dd`. */
  workDate: string;
  /** Local start, `HH:MM` or `H:MM`. */
  start: string;
  /** Local end, `HH:MM` or `H:MM`. May be at or before `start` (overnight). */
  end: string;
};

/**
 * A placed interval, half-open `[startAbs, endAbs)`, in minutes since the epoch.
 * Two intervals can be compared directly whatever dates they fall on.
 */
export type AbsoluteInterval = {
  startAbs: number;
  endAbs: number;
  /** True when the interval ends on a later local date than it started. */
  overnight: boolean;
};

/** Why two intervals cannot both be worked, or null when they can. */
export type IntervalConflict = "overlap" | "unreadable";

export function parseLocalTimeToMinutes(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return hour * 60 + minute;
}

/**
 * Whole days since the epoch for a local ISO date. Anchored at midday UTC so no
 * timezone this product supports can shift the result onto the adjacent day.
 */
export function dayNumberFromIso(isoDate: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return null;
  const ms = Date.parse(`${isoDate}T12:00:00Z`);
  if (!Number.isFinite(ms)) return null;
  return Math.round((ms - MS_PER_DAY / 2) / MS_PER_DAY);
}

export function isoDateFromDayNumber(dayNumber: number): string {
  return new Date(dayNumber * MS_PER_DAY + MS_PER_DAY / 2).toISOString().slice(0, 10);
}

/**
 * True when these local times cross midnight. An end at or before the start is
 * the next day — a zero-length shift is not a thing a manager can mean, and the
 * database enforces `ends_at > starts_at`.
 */
export function isOvernightLocal(start: string, end: string): boolean {
  const startMinutes = parseLocalTimeToMinutes(start);
  const endMinutes = parseLocalTimeToMinutes(end);
  if (startMinutes === null || endMinutes === null) return false;
  return endMinutes <= startMinutes;
}

/** Places local times on the calendar, or null when either time is unreadable. */
export function toAbsoluteInterval(times: LocalShiftTimes): AbsoluteInterval | null {
  const dayNumber = dayNumberFromIso(times.workDate);
  const startMinutes = parseLocalTimeToMinutes(times.start);
  const endMinutes = parseLocalTimeToMinutes(times.end);
  if (dayNumber === null || startMinutes === null || endMinutes === null) return null;

  const overnight = endMinutes <= startMinutes;
  const startAbs = dayNumber * MINUTES_PER_DAY + startMinutes;
  const endAbs = dayNumber * MINUTES_PER_DAY + endMinutes + (overnight ? MINUTES_PER_DAY : 0);
  return { startAbs, endAbs, overnight };
}

export function intervalDurationMinutes(interval: AbsoluteInterval): number {
  return interval.endAbs - interval.startAbs;
}

/** Half-open overlap: touching end-to-start is a clean handover, not a clash. */
export function intervalsOverlap(first: AbsoluteInterval, second: AbsoluteInterval): boolean {
  return first.startAbs < second.endAbs && second.startAbs < first.endAbs;
}

/**
 * The single unreadable-time policy for the whole feature.
 *
 * An unreadable time is reported as a conflict, not waved through. Scheduling two
 * people against a time nobody can parse is the failure that reaches a real shift
 * floor; refusing it is recoverable. Callers get the reason so they can say which
 * of the two it was.
 */
export function intervalConflict(
  first: LocalShiftTimes,
  second: LocalShiftTimes,
): IntervalConflict | null {
  const a = toAbsoluteInterval(first);
  const b = toAbsoluteInterval(second);
  if (!a || !b) return "unreadable";
  return intervalsOverlap(a, b) ? "overlap" : null;
}

/**
 * Every local date the interval touches, in order.
 *
 * Leave, recurring days off and one-off unavailability are recorded against
 * dates, so an overnight shift has to be checked against both the date it starts
 * on and the date it ends on. Three call sites previously built this list by
 * hand and one of them omitted the second date entirely.
 */
export function datesTouchedByInterval(times: LocalShiftTimes): string[] {
  const interval = toAbsoluteInterval(times);
  if (!interval) return [];
  const firstDay = Math.floor(interval.startAbs / MINUTES_PER_DAY);
  // The end is exclusive, so an interval ending exactly at midnight touches only
  // the days before it — subtract a minute before taking the final day.
  const lastDay = Math.floor((interval.endAbs - 1) / MINUTES_PER_DAY);
  const dates: string[] = [];
  for (let day = firstDay; day <= lastDay; day += 1) dates.push(isoDateFromDayNumber(day));
  return dates;
}
