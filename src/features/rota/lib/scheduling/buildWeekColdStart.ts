/**
 * When Build the Week has nothing it could legitimately schedule.
 *
 * Every demand source answers the same question — how many shifts does this
 * venue need this week — from something that already exists: a saved template,
 * a recent week's shape, or the week's own shifts. A brand-new workspace has
 * none of the three, and there is no fourth answer that is not an invention.
 *
 * So the flagship button used to open onto three disabled options, which reads
 * as broken software rather than as the honest fact it is. This rule names that
 * state so the drawer can say what is missing and hand the manager the one tool
 * that fixes it, instead of offering choices that cannot be taken.
 *
 * Pure and deliberately narrow: it decides *whether* a week is a cold start,
 * never what to do about it, and never that anything should be created.
 */

export type BuildWeekColdStartFacts = {
  /**
   * Both source questions have been answered.
   *
   * Required, because "not loaded yet" and "nothing to build from" look
   * identical from the outside, and showing cold-start guidance for a moment
   * before three usable options appear would be its own kind of lie.
   */
  resolved: boolean;
  templateCount: number;
  previousPatternAvailable: boolean;
  /** Shifts already on the target week, assigned or open. */
  plannedShiftCount: number;
};

export function isBuildWeekColdStart(facts: BuildWeekColdStartFacts): boolean {
  if (!facts.resolved) return false;
  return (
    facts.templateCount === 0 && !facts.previousPatternAvailable && facts.plannedShiftCount === 0
  );
}

/**
 * Whether this week's own shifts can be used as demand.
 *
 * The assignment pass fills Open shifts, so a week holding none has nothing for
 * it to do. This is what makes sketching Open shifts the exit from a cold
 * start rather than merely a suggestion.
 */
export function canBuildFromCurrentWeek(openShiftCount: number): boolean {
  return openShiftCount > 0;
}
