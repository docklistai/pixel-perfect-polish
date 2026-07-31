/**
 * Date reading for imported files, where the format has to be stated rather than
 * inferred.
 *
 * The rota itself never has this problem: every date comes from the grid column a
 * shift sits in, so there is nothing to parse. Only a headed import carries dates
 * as text, and there `03/04/2026` is 3 April to one manager and 4 March to
 * another. Guessing is how a whole week lands on the wrong days.
 *
 * So: ISO `yyyy-mm-dd` is always accepted because it is unambiguous, and anything
 * else requires the caller to have declared a day order. A value that is
 * ambiguous under no declared order is refused, never assumed.
 */

export type DateOrder = "iso" | "day-first" | "month-first";

export type DateReadResult =
  | { ok: true; isoDate: string }
  | { ok: false; reason: "ambiguous" | "unreadable" | "out-of-range"; message: string };

const ISO_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const NUMERIC_PATTERN = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4}|\d{2})$/;

function isRealDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

function toIso(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Two-digit years are read into the current century — 26 is 2026, not 1926. */
function expandYear(raw: string): number {
  const value = Number(raw);
  if (raw.length === 4) return value;
  return 2000 + value;
}

export function readDate(input: string, order: DateOrder): DateReadResult {
  const trimmed = input.trim();
  if (!trimmed) {
    return { ok: false, reason: "unreadable", message: "This date is blank." };
  }

  const iso = ISO_PATTERN.exec(trimmed);
  if (iso) {
    const [, year, month, day] = iso;
    if (!isRealDate(Number(year), Number(month), Number(day))) {
      return { ok: false, reason: "out-of-range", message: `"${trimmed}" is not a real date.` };
    }
    return { ok: true, isoDate: trimmed };
  }

  const numeric = NUMERIC_PATTERN.exec(trimmed);
  if (!numeric) {
    return {
      ok: false,
      reason: "unreadable",
      message: `"${trimmed}" is not a date this import understands. Use yyyy-mm-dd.`,
    };
  }

  const [, first, second, rawYear] = numeric;
  const year = expandYear(rawYear!);
  const firstValue = Number(first);
  const secondValue = Number(second);

  if (order === "iso") {
    // The caller said dates would be ISO, and this one is not. Refusing is the
    // point: silently switching to a day order would defeat the declaration.
    return {
      ok: false,
      reason: "ambiguous",
      message:
        `"${trimmed}" is not in yyyy-mm-dd form, so its day and month order is unknown. ` +
        "Choose a date format for this import, or use yyyy-mm-dd.",
    };
  }

  const day = order === "day-first" ? firstValue : secondValue;
  const month = order === "day-first" ? secondValue : firstValue;

  if (!isRealDate(year, month, day)) {
    return {
      ok: false,
      reason: "out-of-range",
      message: `"${trimmed}" is not a real date when read ${order === "day-first" ? "day first" : "month first"}.`,
    };
  }
  return { ok: true, isoDate: toIso(year, month, day) };
}

/**
 * Whether a set of values could be read either way round.
 *
 * Used to warn before an import runs: if every numeric date in the file has a
 * first component of 12 or less, both orders are valid readings of the whole
 * file and the manager's choice genuinely changes the result. When some value
 * has a component above 12 the order is self-evident and no warning is needed.
 */
export function isDateSetAmbiguous(values: readonly string[]): boolean {
  let sawNumeric = false;
  for (const value of values) {
    const numeric = NUMERIC_PATTERN.exec(value.trim());
    if (!numeric) continue;
    sawNumeric = true;
    if (Number(numeric[1]) > 12 || Number(numeric[2]) > 12) return false;
  }
  return sawNumeric;
}
