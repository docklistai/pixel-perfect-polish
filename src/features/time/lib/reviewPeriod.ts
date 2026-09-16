/**
 * Review-period helpers for the Time page. A review period is an operational
 * week (governed by workspace rota_start_weekday, default Monday), derived
 * from an injected date so live mode uses the real current week while demo
 * mode can pin to the frozen demo week. All maths runs on `YYYY-MM-DD` strings
 * in UTC to stay timezone-stable; the "now" boundary is resolved in the
 * workspace timezone via the canonical rota date helper.
 */

import {
  addIsoDays,
  dateIsoInTimezone,
  weekStartForOffset,
} from "@/features/rota/lib/liveRotaDates";

export { dateIsoInTimezone } from "@/features/rota/lib/liveRotaDates";

export interface ReviewPeriod {
  /** Inclusive first day of operational week, `YYYY-MM-DD`. */
  startIso: string;
  /** Inclusive last day of operational week, `YYYY-MM-DD`. */
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

/** The operational week containing `dateIso`, starting on `rotaStartWeekday` (0 = Mon .. 6 = Sun, default 0). */
export function weekPeriodOf(dateIso: string, rotaStartWeekday: number = 0): ReviewPeriod {
  const d = toUtc(dateIso);
  const weekdayMon0 = (d.getUTCDay() + 6) % 7; // 0=Mon..6=Sun
  const diffToStart = (weekdayMon0 - rotaStartWeekday + 7) % 7;
  const start = new Date(d);
  start.setUTCDate(d.getUTCDate() - diffToStart);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  return { startIso: iso(start), endIso: iso(end), label: formatRange(start, end) };
}

/** The same week shifted by `deltaWeeks` (negative = earlier). */
export function shiftPeriod(
  period: ReviewPeriod,
  deltaWeeks: number,
  rotaStartWeekday: number = 0,
): ReviewPeriod {
  const start = toUtc(period.startIso);
  start.setUTCDate(start.getUTCDate() + deltaWeeks * 7);
  return weekPeriodOf(iso(start), rotaStartWeekday);
}

/** True when a `YYYY-MM-DD` work date falls inside the period (inclusive). */
export function isWithinPeriod(workDate: string, period: ReviewPeriod): boolean {
  return workDate >= period.startIso && workDate <= period.endIso;
}

/** Period-scoped, workspace-neutral CSV filename — no hardcoded venue or month. */
export function periodFilename(period: ReviewPeriod): string {
  return `approved-hours_${period.startIso}_to_${period.endIso}.csv`;
}

/** The current real-world review week, resolved in the workspace timezone. */
export function currentWeekPeriod(
  now: Date,
  timeZone: string,
  rotaStartWeekday: number = 0,
): ReviewPeriod {
  const startIso = weekStartForOffset(timeZone, 0, rotaStartWeekday, now);
  const start = toUtc(startIso);
  const end = toUtc(addIsoDays(startIso, 6));
  return { startIso, endIso: iso(end), label: formatRange(start, end) };
}
