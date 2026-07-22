import { isValidShiftTimeRange } from "../../lib/draftRota";

/**
 * Deterministic time-token parsing for the rota inline cell editor.
 *
 * Hospitality shorthand is written without a period ("9-5" means 09:00-17:00),
 * so bare hours are inferred. Anything the manager wrote unambiguously —
 * compact 24-hour ("1530"), a leading-zero hour ("05:00"), an hour of 13+, or
 * midnight — is treated as explicit and never shifted.
 */

export type ParsedTime = {
  value: string;
  hour: number;
  minute: number;
  hasPeriod: boolean;
  rawHour: number;
  /** Written unambiguously as 24-hour, so inference must leave it alone. */
  explicit24: boolean;
  /** Already moved into the afternoon by split-segment context. */
  carried?: boolean;
};

export const TIME_PATTERN = String.raw`(?:\d{3,4}|\d{1,2}(?::|\.)\d{2}|\d{1,2})\s*(?:am|pm)?`;
export const RANGE_PATTERN = new RegExp(
  String.raw`(${TIME_PATTERN})\s*(?:[-–—]|\bto\b|\btill\b|\buntil\b)\s*(${TIME_PATTERN})`,
  "i",
);

export function parseTimePart(value: string): ParsedTime | null {
  const cleaned = value.trim().toLowerCase().replace(".", ":").replace(/\s+/g, "");
  const compact = cleaned.match(/^(\d{1,2})(\d{2})(am|pm)?$/i);
  const colon = cleaned.match(/^(\d{1,2})(?::(\d{2}))?(am|pm)?$/i);
  const match = compact ?? colon;
  if (!match) return null;

  const hourText = match[1]!;
  let hour = Number(hourText);
  const rawHour = hour;
  const minute = match[2] ? Number(match[2]) : 0;
  const period = match[3]?.toLowerCase();
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null;
  if (minute < 0 || minute > 59) return null;
  if (period && (hour < 1 || hour > 12)) return null;
  if (!period && (hour < 0 || hour > 23)) return null;
  if (period === "pm" && hour < 12) hour += 12;
  if (period === "am" && hour === 12) hour = 0;

  const explicit24 =
    !period && (compact !== null || rawHour >= 13 || rawHour === 0 || hourText.length === 2);

  return {
    value: formatHHMM(hour, minute),
    hour,
    minute,
    hasPeriod: Boolean(period),
    rawHour,
    explicit24,
  };
}

function formatHHMM(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function minutesOf(time: ParsedTime): number {
  return time.hour * 60 + time.minute;
}

function inferEndTime(start: ParsedTime, end: ParsedTime): string {
  if (end.hasPeriod) return end.value;
  if (end.hour >= start.hour) return end.value;

  // A start already carried into the afternoon ("9-12, 6-9") is past the usual
  // 18:00 bound, so its end must still be allowed to follow it into the evening.
  const startAllowsInference = start.hour < 18 || start.carried === true;
  const shouldInferAfternoon = !start.hasPeriod && startAllowsInference && end.rawHour <= 11;
  if (!shouldInferAfternoon) return end.value;

  const inferredHour = end.hour + 12;
  if (inferredHour > 23) return end.value;
  return formatHHMM(inferredHour, end.minute);
}

/**
 * Shifts a bare morning hour into the afternoon when an earlier segment of the
 * same cell already ran past it — so "9-12, 5-10" reads as a split shift rather
 * than a 5am start. Explicit 24-hour and am/pm times are returned untouched.
 */
export function carryAfternoonContext(start: ParsedTime, previousEndMinutes: number): ParsedTime {
  if (start.hasPeriod || start.explicit24) return start;
  if (start.rawHour < 1 || start.rawHour > 11) return start;
  if (minutesOf(start) >= previousEndMinutes) return start;

  const shiftedHour = start.hour + 12;
  if (shiftedHour > 23) return start;
  return {
    ...start,
    hour: shiftedHour,
    value: formatHHMM(shiftedHour, start.minute),
    carried: true,
  };
}

export type TimeRange = { start: string; end: string };

/**
 * Parses one "start-end" token pair. `previousEndMinutes` carries the end of the
 * preceding segment in the same cell; pass null for the first (or only) segment.
 */
export function parseTimeRange(
  input: string,
  previousEndMinutes: number | null = null,
): TimeRange | null {
  const match = input.match(RANGE_PATTERN);
  if (!match) return null;
  const parsedStart = parseTimePart(match[1]!);
  const parsedEnd = parseTimePart(match[2]!);
  if (!parsedStart || !parsedEnd) return null;

  const start =
    previousEndMinutes === null
      ? parsedStart
      : carryAfternoonContext(parsedStart, previousEndMinutes);
  const end = inferEndTime(start, parsedEnd);
  if (!isValidShiftTimeRange(start.value, end)) return null;
  return { start: start.value, end };
}

/** End-of-range in minutes from midnight, for carrying context to the next segment. */
export function endMinutesOf(range: TimeRange): number {
  const [hour, minute] = range.end.split(":").map(Number);
  return (hour ?? 0) * 60 + (minute ?? 0);
}
