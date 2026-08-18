import type { TimePulseEntryInput } from "./timePulseTypes";

/**
 * Choosing the one clock session that represents a published shift right now.
 *
 * A shift can accumulate several time entries — someone clocks out by mistake
 * and straight back in, or a manager records a correction. Only one of them is
 * the shift's current truth, and picking it by map-insertion order would make
 * the board depend on row ordering. An open session always wins, because that
 * person is on site now; otherwise the most recent clock-in does. The losers
 * are dropped rather than rendered as a second row, and sessions are never
 * merged, so no attendance fact is invented that no single entry records.
 */
export function chooseShiftEntry(
  left: TimePulseEntryInput,
  right: TimePulseEntryInput,
): TimePulseEntryInput {
  const leftOpen = left.clockedOutAt === null;
  const rightOpen = right.clockedOutAt === null;
  if (leftOpen !== rightOpen) return leftOpen ? left : right;

  const leftIn = left.clockedInAt ? Date.parse(left.clockedInAt) : Number.NEGATIVE_INFINITY;
  const rightIn = right.clockedInAt ? Date.parse(right.clockedInAt) : Number.NEGATIVE_INFINITY;
  if (leftIn !== rightIn) return leftIn > rightIn ? left : right;

  // Identical instants still need a stable answer across reads.
  return left.id <= right.id ? left : right;
}

/** One entry per shift id, chosen deterministically rather than by iteration order. */
export function selectEntriesByShift(
  entries: TimePulseEntryInput[],
): Map<string, TimePulseEntryInput> {
  const byShift = new Map<string, TimePulseEntryInput>();
  for (const entry of entries) {
    if (entry.shiftId === null) continue;
    const current = byShift.get(entry.shiftId);
    byShift.set(entry.shiftId, current ? chooseShiftEntry(current, entry) : entry);
  }
  return byShift;
}
