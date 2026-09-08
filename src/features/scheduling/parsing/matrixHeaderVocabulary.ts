import { readDate, type DateOrder } from "./explicitDateFormat";

/**
 * What a single heading in a pasted grid can be.
 *
 * Kept apart from `matrixHeaders`, which decides what the header ROW means as a
 * whole: this file only answers "what is this one cell", and holds the two
 * vocabularies — the words that name people, and the words that name days.
 */

const NAME_HEADERS = new Set([
  "staff",
  "name",
  "staff name",
  "employee",
  "employee name",
  "person",
  "team member",
]);

/** 0 = Monday .. 6 = Sunday, matching `isoWeekday`. */
const WEEKDAY_TOKENS: Record<string, number> = {
  mon: 0,
  monday: 0,
  tue: 1,
  tues: 1,
  tuesday: 1,
  wed: 2,
  weds: 2,
  wednesday: 2,
  thu: 3,
  thur: 3,
  thurs: 3,
  thursday: 3,
  fri: 4,
  friday: 4,
  sat: 5,
  saturday: 5,
  sun: 6,
  sunday: 6,
};

export type ClassifiedHeader =
  | { kind: "blank" }
  | { kind: "name" }
  | { kind: "day"; by: "date" | "weekday"; isoDate: string }
  /** A weekday with something else beside it, which the two can contradict. */
  | { kind: "weekday-with-extra" }
  | { kind: "other" };

export function normaliseHeaderText(value: string): string {
  return value
    .replace(/[ \t\r\n\f\v]+/g, " ")
    .replace(/^ +| +$/g, "")
    .toLowerCase();
}

/**
 * What one header cell is.
 *
 * A weekday must stand alone. "Mon 25/08" is refused rather than read as
 * Monday, because the weekday and the date can disagree and the disagreement is
 * invisible — the shifts simply land on the wrong days, which is the one
 * failure this whole subsystem exists to prevent.
 */
export function classifyHeader(
  raw: string,
  dateOrder: DateOrder,
  weekByWeekday: ReadonlyMap<number, string>,
): ClassifiedHeader {
  const text = normaliseHeaderText(raw);
  if (text === "") return { kind: "blank" };
  if (NAME_HEADERS.has(text)) return { kind: "name" };

  const date = readDate(raw, dateOrder);
  if (date.ok) return { kind: "day", by: "date", isoDate: date.isoDate };

  const weekday = WEEKDAY_TOKENS[text];
  if (weekday !== undefined) {
    const isoDate = weekByWeekday.get(weekday);
    return isoDate ? { kind: "day", by: "weekday", isoDate } : { kind: "other" };
  }

  const firstToken = text.split(" ")[0] ?? "";
  if (WEEKDAY_TOKENS[firstToken] !== undefined) return { kind: "weekday-with-extra" };

  return { kind: "other" };
}
