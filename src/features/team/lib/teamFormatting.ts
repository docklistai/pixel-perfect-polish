/** Date and label formatting for the Team surface. No domain logic lives here. */

const DATE_FORMAT = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});
const DATE_TIME_FORMAT = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});
const MONTH_DAY_FORMAT = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });

export function formatDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : DATE_FORMAT.format(date);
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : DATE_TIME_FORMAT.format(date);
}

/**
 * Day + month only. There is no birth year in the schema to format, which is
 * the point — the record cannot yield an age (ADR-0004). The year passed to
 * `Date.UTC` is an arbitrary non-leap-safe carrier and is never displayed.
 */
export function formatBirthday(birthDay: number, birthMonth: number): string {
  return MONTH_DAY_FORMAT.format(new Date(Date.UTC(2001, birthMonth - 1, birthDay)));
}

/** "Today" / "Tomorrow" / "3 days" / "3 days ago", matching the rail's wording. */
export function relativeDays(iso: string, now: Date = new Date()): string {
  const target = new Date(iso);
  if (Number.isNaN(target.getTime())) return "";
  const startOfDay = (date: Date) => Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const days = Math.round((startOfDay(target) - startOfDay(now)) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days > 1) return `${days} days`;
  if (days === -1) return "Yesterday";
  return `${Math.abs(days)} days ago`;
}
