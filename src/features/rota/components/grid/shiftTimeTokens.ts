import { isValidShiftTimeRange } from "../../lib/draftRota";
import {
  RANGE_PATTERN,
  resolveTimePair,
  type ResolvedTimePair,
} from "../../lib/scheduling/shiftTimeVocabulary";

/**
 * The inline cell editor's view of the shared time vocabulary.
 *
 * What a written time MEANS lives in `lib/scheduling/shiftTimeVocabulary` and is
 * shared with the headed schedule import, so the two cannot drift. What survives
 * as a rota shift is decided by the grid's maximum shift duration, applied here
 * for a typed cell and in `headedTimeField` for a pasted row — one ceiling, read
 * from `rotaTimeUtils` by both, because both create the same shift records.
 */

export {
  carryAfternoonContext,
  minutesOf,
  parseTimePart,
  RANGE_PATTERN,
  TIME_PATTERN,
  type ParsedTime,
} from "../../lib/scheduling/shiftTimeVocabulary";

export type TimeRange = { start: string; end: string; ambiguousBareHours: boolean };

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

  const resolved: ResolvedTimePair | null = resolveTimePair(
    match[1]!,
    match[2]!,
    previousEndMinutes,
  );
  if (!resolved) return null;
  if (!isValidShiftTimeRange(resolved.start, resolved.end)) return null;
  return resolved;
}

/** End-of-range in minutes from midnight, for carrying context to the next segment. */
export function endMinutesOf(range: { end: string }): number {
  const [hour, minute] = range.end.split(":").map(Number);
  return (hour ?? 0) * 60 + (minute ?? 0);
}
