/**
 * The one time vocabulary for rota scheduling.
 *
 * Two surfaces let a manager write a time: the inline cell editor and the
 * headed schedule import. They used to disagree — the editor understood "9am"
 * and the importer only "09:00" — so the same shift was readable in one place
 * and a validation error in the other. Everything that decides what a written
 * time MEANS now lives here, and both callers delegate.
 *
 * Hospitality shorthand is written without a period ("9-5" means 09:00-17:00),
 * so bare hours are inferred. Anything written unambiguously — compact 24-hour
 * ("1530"), a leading zero ("05:00"), an hour of 13+, a clock time ("10:00"), or
 * midnight — is explicit and never shifted, including when that leaves the end
 * before the start, which is how an overnight shift is written.
 *
 * Inference is never silent. A pair that reads as a morning shift only because
 * both hours were written bare comes back flagged, so the caller can say what
 * it decided instead of quietly choosing one of two readings.
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

/** Shown to managers wherever a time is typed or pasted. One list, one truth. */
export const SUPPORTED_TIME_FORMATS = ["09:00", "9:00", "9am", "9 am", "9:30pm", "1530"] as const;

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

  // Explicitness is the shape of the hour, not the width of the string. The
  // last clause tests hour and minutes together because "10" and "10:00" share
  // a two-character hour and only one is a clock time: "10" is the shorthand
  // "9" is, and reading it as explicit made "9-12, 5-10" finish at 10am.
  const explicitHour = rawHour >= 13 || rawHour === 0 || hourText.startsWith("0");
  const clockTime = hourText.length === 2 && match[2] !== undefined;
  const explicit24 = !period && (compact !== null || explicitHour || clockTime);

  return {
    value: formatHHMM(hour, minute),
    hour,
    minute,
    hasPeriod: Boolean(period),
    rawHour,
    explicit24,
  };
}

export function formatHHMM(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function minutesOf(time: ParsedTime): number {
  return time.hour * 60 + time.minute;
}

/** Minutes from midnight for an already-formatted `HH:MM`, or null. */
export function minutesFromHHMM(value: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function inferEndTime(start: ParsedTime, end: ParsedTime): string {
  // An explicit end means what it says, including when it lands *before* the
  // start: "09:00"–"02:00" runs past midnight, it is not a 2am meant as 2pm.
  if (end.hasPeriod || end.explicit24) return end.value;
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

const NOON_MINUTES = 12 * 60;

/**
 * Whether this pair is a bare-hour range that was read as a morning shift when
 * an evening one was equally available — "5-10", "3-11", "6-11".
 *
 * The rule is deliberately mechanical rather than a guess at plausible opening
 * hours: the start hour was written bare (no am/pm, no leading zero, no 24-hour
 * form), the end carries no period of its own, and the resolved shift finishes
 * *before* noon. Anything the manager marked explicitly — "9am-5pm",
 * "09:00-17:00", "9pm-2am" — is never flagged, and neither is "9-5", whose end
 * was inferred into the afternoon.
 *
 * Noon is the boundary rather than the last flagged minute because a shift that
 * reaches midday is already a day shift: "9-12" is a morning on any reading, and
 * warning about it would put a note on the most ordinary split-cell segment
 * there is ("9-12, 5-10"). A shift ending at 10:00 or 11:00 is the one that
 * genuinely reads either way.
 */
function isAmbiguousBareHourPair(start: ParsedTime, end: ParsedTime, resolvedEnd: string): boolean {
  if (start.hasPeriod || start.explicit24 || start.carried === true) return false;
  if (start.rawHour < 1 || start.rawHour > 11) return false;
  if (end.hasPeriod) return false;
  const endMinutes = minutesFromHHMM(resolvedEnd);
  return endMinutes !== null && endMinutes < NOON_MINUTES;
}

export type ResolvedTimePair = {
  start: string;
  end: string;
  /** Read as a morning shift, but an evening reading was equally available. */
  ambiguousBareHours: boolean;
};

/**
 * Resolves a start and an end that arrived as separate values — the headed
 * import's two columns, or the two halves of an inline range.
 *
 * `previousEndMinutes` carries the end of the preceding segment in the same
 * inline cell; pass null when there is no preceding segment, which is always the
 * case for an imported row.
 */
export function resolveTimePair(
  startText: string,
  endText: string,
  previousEndMinutes: number | null = null,
): ResolvedTimePair | null {
  const parsedStart = parseTimePart(startText);
  const parsedEnd = parseTimePart(endText);
  if (!parsedStart || !parsedEnd) return null;

  const start =
    previousEndMinutes === null
      ? parsedStart
      : carryAfternoonContext(parsedStart, previousEndMinutes);
  const end = inferEndTime(start, parsedEnd);

  return {
    start: start.value,
    end,
    ambiguousBareHours: isAmbiguousBareHourPair(start, parsedEnd, end),
  };
}

/** "Interpreted as 05:00–10:00" — the read-back an ambiguous pair must carry. */
export function describeResolvedTimes(start: string, end: string): string {
  return `Interpreted as ${start}–${end}. Write am or pm to change it.`;
}
