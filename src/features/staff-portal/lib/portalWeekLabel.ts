import { currentWeekStrip, DEMO_NOW, type PortalNow } from "./portalRota";

/**
 * "8 – 14 Jun 2026"-style label for the Mon–Sun week containing `now`, derived
 * from the same clock the week strip uses (real wall-clock live, demo clock
 * offline). Cross-month and cross-year ranges spell out both ends so the label
 * is never ambiguous. Replaces any hardcoded week string in portal surfaces.
 */
export function currentWeekRangeLabel(now: PortalNow = DEMO_NOW): string {
  const days = currentWeekStrip(now);
  const start = new Date(`${days[0]!.iso}T00:00:00Z`);
  const end = new Date(`${days[6]!.iso}T00:00:00Z`);
  const fmt = (date: Date, withYear: boolean) =>
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "UTC",
      day: "numeric",
      month: "short",
      ...(withYear ? { year: "numeric" } : {}),
    }).format(date);
  const sameMonth =
    start.getUTCFullYear() === end.getUTCFullYear() && start.getUTCMonth() === end.getUTCMonth();
  if (sameMonth) return `${start.getUTCDate()} – ${fmt(end, true)}`;
  const sameYear = start.getUTCFullYear() === end.getUTCFullYear();
  return `${fmt(start, !sameYear)} – ${fmt(end, true)}`;
}
