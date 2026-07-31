import type { ConflictSummary, DraftShift, ShiftId, StaffMember } from "../types";
import { formatShiftTime } from "./draftRota";
import { intervalConflict } from "./scheduling/calendarInterval";
import { draftShiftTimes } from "./scheduling/draftShiftAdapter";

/**
 * Double-booking detection for the grid and the publish boundary.
 *
 * Overlap is decided by the shared interval engine
 * (`scheduling/calendarInterval.ts`) rather than by comparing minutes within one
 * day index, so a shift that runs past midnight is compared against the next
 * day's shifts as well. Two of this feature's four former overlap
 * implementations also disagreed about unreadable times; the engine settles that
 * centrally by reporting them as a conflict.
 */

type ConflictPair = {
  base: DraftShift;
  overlapping: DraftShift;
};

/**
 * `dayIsoDates` is optional. Real dates are used when the caller has them;
 * otherwise the adapter substitutes a synthetic week, which is sufficient because
 * overlap only depends on the distance between two days.
 */
function shiftsOverlap(
  first: DraftShift,
  second: DraftShift,
  dayIsoDates?: readonly string[],
): boolean {
  if (first.staffId === null || second.staffId === null) return false;
  if (first.staffId !== second.staffId) return false;
  return (
    intervalConflict(draftShiftTimes(first, dayIsoDates), draftShiftTimes(second, dayIsoDates)) !==
    null
  );
}

function localConflictPairs(shifts: DraftShift[], dayIsoDates?: readonly string[]): ConflictPair[] {
  const assigned = shifts.filter((shift) => shift.staffId !== null);
  const pairs: ConflictPair[] = [];

  for (let i = 0; i < assigned.length; i += 1) {
    for (let j = i + 1; j < assigned.length; j += 1) {
      const first = assigned[i]!;
      const second = assigned[j]!;
      if (!shiftsOverlap(first, second, dayIsoDates)) continue;
      pairs.push({ base: first, overlapping: second });
      pairs.push({ base: second, overlapping: first });
    }
  }

  return pairs;
}

export function localConflictShiftIds(
  shifts: DraftShift[],
  dayIsoDates?: readonly string[],
): Set<ShiftId> {
  return new Set(localConflictPairs(shifts, dayIsoDates).map((pair) => pair.base.id));
}

export function withLocalConflictStatus(
  shifts: DraftShift[],
  dayIsoDates?: readonly string[],
): DraftShift[] {
  const conflictIds = localConflictShiftIds(shifts, dayIsoDates);
  return shifts.map((shift) => {
    if (shift.staffId === null) return { ...shift, status: "open", tone: "open" };
    return {
      ...shift,
      status: conflictIds.has(shift.id) ? "conflict" : "scheduled",
    };
  });
}

export function buildLocalConflictSummaries(
  shifts: DraftShift[],
  staff: StaffMember[],
  dayLabels: string[],
  dayIsoDates?: readonly string[],
): ConflictSummary[] {
  return localConflictPairs(shifts, dayIsoDates)
    .filter(({ base, overlapping }) => base.id < overlapping.id)
    .map(({ base, overlapping }) => {
      const staffName = staff.find((member) => member.id === base.staffId)?.name ?? "Unknown";
      // An overnight pair spans two columns, so the day label alone would read as
      // if both shifts were on the same day. Naming both days keeps it honest.
      const sameDay = base.dayIndex === overlapping.dayIndex;
      const overlappingDay = dayLabels[overlapping.dayIndex] ?? "";

      return {
        id: base.id,
        staff: staffName,
        day: dayLabels[base.dayIndex] ?? "",
        detail: sameDay
          ? `${base.role} · ${formatShiftTime(base.start, base.end)} and ${formatShiftTime(overlapping.start, overlapping.end)}`
          : `${base.role} · ${formatShiftTime(base.start, base.end)} runs into ${overlappingDay} ${formatShiftTime(overlapping.start, overlapping.end)}`,
        cause: sameDay
          ? `${staffName} has two overlapping shifts.`
          : `${staffName} has a shift that runs past midnight into another shift.`,
        guidance: "Review the times or assign one shift to another staff member.",
      };
    });
}
