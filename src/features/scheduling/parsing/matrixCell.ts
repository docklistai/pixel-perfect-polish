import { RANGE_PATTERN } from "@/features/rota/lib/scheduling/shiftTimeVocabulary";

/**
 * What one cell of a staff × day grid says.
 *
 * A grid cell carries a shift written the way a manager writes it on paper:
 * "9-5", "Bar 9-5", "09:00–17:00". This finds the time range using the shared
 * scheduling vocabulary — the same pattern the inline rota editor uses — and
 * treats whatever is left as the role.
 *
 * It deliberately does NOT decide what the times MEAN. The two halves are
 * handed back as written, so `readTimes` resolves them exactly as it resolves a
 * long-format row: same shorthand, same overnight rule, same duration limit,
 * same ambiguity warning. There is one time authority and this is not it.
 */

/** A second range in the same cell — "9-5, 6-11" — which this will not guess at. */
const SECOND_RANGE = new RegExp(RANGE_PATTERN.source, "i");

export type MatrixCellRead =
  | { ok: true; start: string; end: string; role: string }
  | { ok: false; message: string };

/** Punctuation a manager puts between a role and its times. */
const SEPARATORS = /^[\s\-–—,;:|/]+|[\s\-–—,;:|/]+$/g;

export function readMatrixCell(raw: string): MatrixCellRead {
  const text = raw.trim();
  const match = RANGE_PATTERN.exec(text);
  if (!match) {
    return {
      ok: false,
      message: `"${text}" is not a shift. Write the hours, such as 9-5 or 09:00-17:00, or leave the cell empty for a day off.`,
    };
  }

  const remainder = (text.slice(0, match.index) + text.slice(match.index + match[0].length))
    .replace(SEPARATORS, "")
    .trim();

  // Two shifts in one cell have two readings — which role, which order — and
  // picking one would be a guess about somebody's working day.
  if (SECOND_RANGE.test(remainder)) {
    return {
      ok: false,
      message: `"${text}" has more than one shift in a single cell. Give each shift its own cell or row, or add the second one on the rota afterwards.`,
    };
  }

  // Trimmed because the time pattern's optional am/pm lets it absorb the space
  // after a bare hour — "9-5 Bar" ends "5 ", which reads oddly quoted back.
  return {
    ok: true,
    start: (match[1] ?? "").trim(),
    end: (match[2] ?? "").trim(),
    role: remainder,
  };
}
