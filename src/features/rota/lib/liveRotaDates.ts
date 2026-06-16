import type { RotaDayIndex } from "../types";

const MONTH_NAMES = [
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
];
const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MAX_SHIFT_DURATION_MINUTES = 16 * 60;

function datePartsInTimezone(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return { year: value("year"), month: value("month"), day: value("day") };
}

export function dateIsoInTimezone(date: Date, timezone: string): string {
  const { year, month, day } = datePartsInTimezone(date, timezone);
  return `${year}-${month}-${day}`;
}

export function addIsoDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function addIsoDaysDate(isoDate: string, days: number): Date {
  return new Date(`${addIsoDays(isoDate, days)}T12:00:00Z`);
}

export function weekStartForOffset(
  timezone: string,
  weekOffset: number,
  baseDate: Date = new Date(),
): string {
  const today = dateIsoInTimezone(baseDate, timezone);
  const weekday = new Date(`${today}T12:00:00Z`).getUTCDay();
  const daysSinceMonday = weekday === 0 ? 6 : weekday - 1;
  return addIsoDays(today, weekOffset * 7 - daysSinceMonday);
}

export function liveWeekDayLabels(weekStart: string): string[] {
  return DAY_NAMES.map((day, index) => {
    const date = addIsoDaysDate(weekStart, index);
    return `${day} ${date.getUTCDate()} ${MONTH_NAMES[date.getUTCMonth()]}`;
  });
}

export function liveWeekLabel(weekStart: string): string {
  const start = addIsoDaysDate(weekStart, 0);
  const end = addIsoDaysDate(weekStart, 6);
  if (start.getUTCMonth() === end.getUTCMonth()) {
    return `${start.getUTCDate()}–${end.getUTCDate()} ${MONTH_NAMES[start.getUTCMonth()]}`;
  }
  return `${start.getUTCDate()} ${MONTH_NAMES[start.getUTCMonth()]} – ${end.getUTCDate()} ${MONTH_NAMES[end.getUTCMonth()]}`;
}

export function liveCurrentDayIndex(weekStart: string, today: string): number | null {
  const start = addIsoDaysDate(weekStart, 0).getTime();
  const current = addIsoDaysDate(today, 0).getTime();
  const index = Math.round((current - start) / 86_400_000);
  return index >= 0 && index <= 6 ? index : null;
}

export function dayIndexFromDates(weekStartIso: string, shiftDateIso: string): RotaDayIndex {
  const start = new Date(`${weekStartIso}T00:00:00Z`).getTime();
  const day = new Date(`${shiftDateIso}T00:00:00Z`).getTime();
  const diff = Math.round((day - start) / 86_400_000);
  if (diff < 0 || diff > 6) throw new Error("Shift date falls outside its rota week");
  return diff as RotaDayIndex;
}

export function formatTimeInTimezone(iso: string, timezone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

function parseHHMM(value: string): number | null {
  const match = value.match(/^(\d{2}):(\d{2})$/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return hour * 60 + minute;
}

function localPartsAsUtcMs(date: Date, timezone: string): number {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);
  return Date.UTC(
    value("year"),
    value("month") - 1,
    value("day"),
    value("hour"),
    value("minute"),
    value("second"),
  );
}

function zonedLocalTimeToUtcIso(dateIso: string, hhmm: string, timezone: string): string {
  const minutes = parseHHMM(hhmm);
  if (minutes === null) throw new Error("Shift time must use HH:MM format");
  const [year, month, day] = dateIso.split("-").map(Number);
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const targetUtc = Date.UTC(year!, month! - 1, day!, hour, minute, 0);
  let guess = targetUtc;

  for (let i = 0; i < 3; i += 1) {
    const localAsUtc = localPartsAsUtcMs(new Date(guess), timezone);
    guess += targetUtc - localAsUtc;
  }

  return new Date(guess).toISOString();
}

export function buildShiftDateTimeRange({
  weekStart,
  dayIndex,
  start,
  end,
  timezone,
}: {
  weekStart: string;
  dayIndex: RotaDayIndex;
  start: string;
  end: string;
  timezone: string;
}): { shiftDate: string; startsAt: string; endsAt: string } {
  const startMinutes = parseHHMM(start);
  const endMinutes = parseHHMM(end);
  if (startMinutes === null || endMinutes === null)
    throw new Error("Shift time must use HH:MM format");
  if (startMinutes === endMinutes) throw new Error("Shift start and end times must be different");

  const duration =
    endMinutes > startMinutes ? endMinutes - startMinutes : endMinutes + 24 * 60 - startMinutes;
  if (duration > MAX_SHIFT_DURATION_MINUTES) {
    throw new Error("Shift duration cannot exceed 16 hours");
  }

  const shiftDate = addIsoDays(weekStart, dayIndex);
  const endDate = endMinutes < startMinutes ? addIsoDays(shiftDate, 1) : shiftDate;
  return {
    shiftDate,
    startsAt: zonedLocalTimeToUtcIso(shiftDate, start, timezone),
    endsAt: zonedLocalTimeToUtcIso(endDate, end, timezone),
  };
}
