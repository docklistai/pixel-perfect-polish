import { addIsoDays } from "../liveRotaDates";

/**
 * Which earlier week a staffing pattern may be taken from.
 *
 * "Last week" used to mean exactly `weekStart - 7`, which made the source
 * useless in the situation it is most needed: a workspace whose immediately
 * previous week was never filled in. A quiet week, a closure, or simply a rota
 * that started on a Wednesday left the manager with nothing to build from even
 * though a perfectly good pattern sat one week further back.
 *
 * The search therefore looks back a bounded number of weeks and takes the
 * NEAREST one that actually has shifts. Bounded on purpose: reaching further
 * would quietly rebuild a week from a rota old enough that the venue's shape has
 * moved on, and a manager reading "pattern from six weeks ago" cannot tell
 * whether that was intended. Four weeks is recent enough to still describe the
 * business and short enough to state plainly.
 *
 * Both halves are pure. The database work — reading which of these weeks exist
 * and how many shifts each holds — belongs to the caller, so the rule itself can
 * be tested without one.
 */

export const PATTERN_LOOKBACK_WEEKS = 4;

/** One earlier week considered as a pattern source. */
export type PatternWeekCandidate = {
  rotaWeekId: string;
  weekStart: string;
  /** 1 = the immediately previous week, up to PATTERN_LOOKBACK_WEEKS. */
  weeksBack: number;
  shiftCount: number;
};

/**
 * The week starts to look at, nearest first.
 *
 * Ordered rather than merely listed, because "nearest wins" is the rule and the
 * caller should not have to re-derive it from the dates.
 */
export function patternWeekStarts(weekStart: string): { weekStart: string; weeksBack: number }[] {
  return Array.from({ length: PATTERN_LOOKBACK_WEEKS }, (_, index) => {
    const weeksBack = index + 1;
    return { weekStart: addIsoDays(weekStart, -7 * weeksBack), weeksBack };
  });
}

/**
 * The nearest candidate that has any shifts, or null when none does.
 *
 * Candidates outside the lookback window are ignored rather than trusted, so a
 * caller that over-fetches cannot widen the rule by accident.
 */
export function chooseRecentPatternWeek(
  candidates: readonly PatternWeekCandidate[],
): PatternWeekCandidate | null {
  const eligible = candidates.filter(
    (candidate) =>
      candidate.shiftCount > 0 &&
      candidate.weeksBack >= 1 &&
      candidate.weeksBack <= PATTERN_LOOKBACK_WEEKS,
  );
  if (eligible.length === 0) return null;
  return eligible.reduce((nearest, candidate) =>
    candidate.weeksBack < nearest.weeksBack ? candidate : nearest,
  );
}
