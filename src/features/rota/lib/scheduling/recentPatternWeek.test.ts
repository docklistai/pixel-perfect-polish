import { describe, expect, it } from "vitest";
import {
  chooseRecentPatternWeek,
  patternWeekStarts,
  PATTERN_LOOKBACK_WEEKS,
  type PatternWeekCandidate,
} from "./recentPatternWeek";

/**
 * The bounded backwards search for a staffing pattern.
 *
 * Two properties matter and neither is obvious from the code alone: the NEAREST
 * shift-bearing week wins, so a manager gets the most recent shape rather than
 * the oldest one still in range; and the window is closed, so a rota old enough
 * to describe a different business is never silently reused.
 */

// 2026-06-15 is a Monday.
const WEEK = "2026-06-15";

function candidate(weeksBack: number, shiftCount: number): PatternWeekCandidate {
  const starts = patternWeekStarts(WEEK);
  const match = starts.find((entry) => entry.weeksBack === weeksBack);
  return {
    rotaWeekId: `week-${weeksBack}`,
    // Weeks outside the window have no generated start; synthesise one so the
    // filter is what rejects them, not a missing date.
    weekStart: match?.weekStart ?? `out-of-range-${weeksBack}`,
    weeksBack,
    shiftCount,
  };
}

describe("patternWeekStarts", () => {
  it("offers exactly the four preceding weeks, nearest first", () => {
    expect(patternWeekStarts(WEEK)).toEqual([
      { weekStart: "2026-06-08", weeksBack: 1 },
      { weekStart: "2026-06-01", weeksBack: 2 },
      { weekStart: "2026-05-25", weeksBack: 3 },
      { weekStart: "2026-05-18", weeksBack: 4 },
    ]);
  });

  it("never reaches a fifth week back", () => {
    const starts = patternWeekStarts(WEEK);
    expect(starts).toHaveLength(PATTERN_LOOKBACK_WEEKS);
    expect(starts.map((entry) => entry.weekStart)).not.toContain("2026-05-11");
  });
});

describe("chooseRecentPatternWeek", () => {
  it("uses the immediately previous week when it has shifts", () => {
    const chosen = chooseRecentPatternWeek([candidate(1, 12), candidate(2, 30)]);
    expect(chosen?.weeksBack).toBe(1);
    expect(chosen?.weekStart).toBe("2026-06-08");
  });

  it("falls back to week -2 when week -1 is empty", () => {
    const chosen = chooseRecentPatternWeek([candidate(1, 0), candidate(2, 9)]);
    expect(chosen?.weeksBack).toBe(2);
    expect(chosen?.weekStart).toBe("2026-06-01");
  });

  it("takes the NEAREST shift-bearing week, not the busiest or the oldest", () => {
    const chosen = chooseRecentPatternWeek([
      candidate(4, 99),
      candidate(2, 3),
      candidate(1, 0),
      candidate(3, 40),
    ]);
    expect(chosen?.weeksBack).toBe(2);
  });

  it("still reaches the fourth week back when everything nearer is empty", () => {
    const chosen = chooseRecentPatternWeek([
      candidate(1, 0),
      candidate(2, 0),
      candidate(3, 0),
      candidate(4, 5),
    ]);
    expect(chosen?.weeksBack).toBe(4);
  });

  it("reports nothing when no week in the window has shifts", () => {
    expect(
      chooseRecentPatternWeek([candidate(1, 0), candidate(2, 0), candidate(3, 0), candidate(4, 0)]),
    ).toBeNull();
  });

  it("reports nothing when there are no candidate weeks at all", () => {
    expect(chooseRecentPatternWeek([])).toBeNull();
  });

  // The window is a rule, not a query detail: a caller that over-fetches must
  // not be able to widen it by handing in an older week.
  it("refuses a fifth week back even when it is offered", () => {
    expect(chooseRecentPatternWeek([candidate(5, 20)])).toBeNull();
  });

  it("prefers a week inside the window over an older one offered alongside it", () => {
    const chosen = chooseRecentPatternWeek([candidate(5, 50), candidate(4, 1)]);
    expect(chosen?.weeksBack).toBe(4);
  });

  it("ignores a nonsensical zero or negative offset", () => {
    expect(chooseRecentPatternWeek([candidate(0, 10), candidate(-1, 10)])).toBeNull();
  });
});
