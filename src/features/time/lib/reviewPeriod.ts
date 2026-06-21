/**
 * Review-period helpers for the Time page. A review period is a Monday–Sunday
 * week, derived from an injected date so live mode uses the real current week
 * while demo mode can pin to the frozen demo week. All maths runs on
 * `YYYY-MM-DD` strings in UTC to stay timezone-stable; the "now" boundary is
 * resolved in the workspace timezone via {@link londonDateIso}.
 */

export interface ReviewPeriod {
  /** Inclusive Monday, `YYYY-MM-DD`. */
  startIso: string;
  /** Inclusive Sunday, `YYYY-MM-DD`. */
  endIso: string;
  /** Human label, e.g. "8 – 14 Jun 2026". */
  label: string;
}

const MONTHS = [
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

const WORKSPACE_TZ = "Europe/London";

function toUtc(dateIso: string): Date {
  const [y, m, d] = dateIso.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!));
}

function iso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatRange(a: Date, b: Date): string {
  const da = a.getUTCDate();
  const db = b.getUTCDate();
  const ma = MONTHS[a.getUTCMonth()];
  const mb = MONTHS[b.getUTCMonth()];
  const ya = a.getUTCFullYear();
  const yb = b.getUTCFullYear();
  if (ya !== yb) return `${da} ${ma} ${ya} – ${db} ${mb} ${yb}`;
  if (ma !== mb) return `${da} ${ma} – ${db} ${mb} ${yb}`;
  return `${da} – ${db} ${mb} ${yb}`;
}

/** The Monday–Sunday week containing `dateIso`. */
export function weekPeriodOf(dateIso: string): ReviewPeriod {
  const d = toUtc(dateIso);
  const diffToMonday = (d.getUTCDay() + 6) % 7; // 0=Sun..6=Sat → days since Monday
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() - diffToMonday);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  return { startIso: iso(monday), endIso: iso(sunday), label: formatRange(monday, sunday) };
}

/** The same week shifted by `deltaWeeks` (negative = earlier). */
export function shiftPeriod(period: ReviewPeriod, deltaWeeks: number): ReviewPeriod {
  const start = toUtc(period.startIso);
  start.setUTCDate(start.getUTCDate() + deltaWeeks * 7);
  return weekPeriodOf(iso(start));
}

/** True when a `YYYY-MM-DD` work date falls inside the period (inclusive). */
export function isWithinPeriod(workDate: string, period: ReviewPeriod): boolean {
  return workDate >= period.startIso && workDate <= period.endIso;
}

/** Period-scoped, workspace-neutral CSV filename — no hardcoded venue or month. */
export function periodFilename(period: ReviewPeriod): string {
  return `approved-hours_${period.startIso}_to_${period.endIso}.csv`;
}

/** Today's date (`YYYY-MM-DD`) in the workspace timezone for the given instant. */
export function londonDateIso(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: WORKSPACE_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** The current real-world review week, resolved in the workspace timezone. */
export function currentWeekPeriod(now: Date): ReviewPeriod {
  return weekPeriodOf(londonDateIso(now));
}
