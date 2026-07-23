/**
 * Arbitration rules for committing typed input into a cell that already holds
 * shifts. They decide only whether an edit may proceed and what to say when it
 * may not — they never touch state, so the same rules can validate an edit
 * ahead of time instead of refusing it mid-flight.
 */

export type InlineCommitRefusal = { title: string; description: string };

/**
 * A bare `clear` on a split cell is ambiguous: it cannot say which of the two
 * shifts should go. `clear all` is the explicit form.
 */
export function refuseAmbiguousClear(
  existingShiftCount: number,
  clearAll: boolean,
): InlineCommitRefusal | null {
  if (existingShiftCount <= 1 || clearAll) return null;
  return {
    title: "Multiple shifts in this cell",
    description: "Open a shift menu to clear one shift, or type clear all to remove both.",
  };
}

/**
 * Typed ranges must line up one-for-one with the shifts already in a split cell,
 * otherwise the edit would silently pick a shift to overwrite.
 */
export function refuseSplitMismatch(
  existingShiftCount: number,
  parsedShiftCount: number,
): InlineCommitRefusal | null {
  if (existingShiftCount <= 1 || parsedShiftCount === existingShiftCount) return null;
  if (parsedShiftCount === 1) {
    return {
      title: "Choose a specific split shift",
      description: "Open a shift pill to edit one shift, or enter matching split ranges.",
    };
  }
  return {
    title: "Split edit needs matching ranges",
    description: `This cell has ${existingShiftCount} shifts. Enter ${existingShiftCount} ranges or edit one shift from its menu.`,
  };
}
