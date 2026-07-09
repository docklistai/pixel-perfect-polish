/**
 * Recurring (standing) day-off requests: a staff member's fixed weekday they
 * cannot work, recurring every week until withdrawn. Pure helpers shared by the
 * portal requester and the manager approval card. Weekday is 0 = Monday .. 6 =
 * Sunday, matching the Monday-first rota and the phase 14 backend.
 */

export const WEEKDAY_LABELS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export const WEEKDAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export type RecurringDayOffStatus = "pending" | "approved" | "declined";

export type RecurringDayOff = {
  requestId: string;
  /** 0 = Monday .. 6 = Sunday. */
  weekday: number;
  status: RecurringDayOffStatus;
  note: string | null;
  decisionNote: string | null;
};

export function weekdayLabel(weekday: number): string {
  return WEEKDAY_LABELS[weekday] ?? "—";
}

export type WeekdayCell = {
  weekday: number;
  shortLabel: string;
  label: string;
  /** The existing request for this weekday, or null when the day is free. */
  request: RecurringDayOff | null;
};

/** Mon..Sun cells, each carrying its existing request (if any). */
export function buildWeekdayCells(requests: RecurringDayOff[]): WeekdayCell[] {
  const byWeekday = new Map<number, RecurringDayOff>();
  for (const request of requests) byWeekday.set(request.weekday, request);
  return WEEKDAY_SHORT.map((short, weekday) => ({
    weekday,
    shortLabel: short,
    label: WEEKDAY_LABELS[weekday]!,
    request: byWeekday.get(weekday) ?? null,
  }));
}

/** Approved weekdays as sorted labels, for a compact "off every …" summary. */
export function approvedWeekdayLabels(requests: RecurringDayOff[]): string[] {
  return requests
    .filter((request) => request.status === "approved")
    .map((request) => request.weekday)
    .sort((a, b) => a - b)
    .map(weekdayLabel);
}
