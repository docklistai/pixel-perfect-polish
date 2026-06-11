import type { ConflictSummary, DraftShift, ShiftId, StaffMember } from "../types";
import { formatShiftTime, getShiftDurationMinutes, parseHHMMToMinutes } from "./draftRota";

type ConflictPair = {
  base: DraftShift;
  overlapping: DraftShift;
};

function shiftStartMinutes(shift: DraftShift): number | null {
  return parseHHMMToMinutes(shift.start);
}

function shiftEndMinutes(shift: DraftShift): number | null {
  const start = shiftStartMinutes(shift);
  const duration = getShiftDurationMinutes(shift.start, shift.end);
  if (start === null || duration === null) return null;
  return start + duration;
}

function shiftsOverlap(first: DraftShift, second: DraftShift): boolean {
  if (first.dayIndex !== second.dayIndex || first.staffId === null || second.staffId === null) {
    return false;
  }
  if (first.staffId !== second.staffId) return false;

  const firstStart = shiftStartMinutes(first);
  const firstEnd = shiftEndMinutes(first);
  const secondStart = shiftStartMinutes(second);
  const secondEnd = shiftEndMinutes(second);

  if (firstStart === null || firstEnd === null || secondStart === null || secondEnd === null) {
    return false;
  }

  return firstStart < secondEnd && secondStart < firstEnd;
}

function localConflictPairs(shifts: DraftShift[]): ConflictPair[] {
  const assigned = shifts.filter((shift) => shift.staffId !== null);
  const pairs: ConflictPair[] = [];

  for (let i = 0; i < assigned.length; i += 1) {
    for (let j = i + 1; j < assigned.length; j += 1) {
      const first = assigned[i]!;
      const second = assigned[j]!;
      if (!shiftsOverlap(first, second)) continue;
      pairs.push({ base: first, overlapping: second });
      pairs.push({ base: second, overlapping: first });
    }
  }

  return pairs;
}

export function localConflictShiftIds(shifts: DraftShift[]): Set<ShiftId> {
  return new Set(localConflictPairs(shifts).map((pair) => pair.base.id));
}

export function withLocalConflictStatus(shifts: DraftShift[]): DraftShift[] {
  const conflictIds = localConflictShiftIds(shifts);
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
): ConflictSummary[] {
  return localConflictPairs(shifts)
    .filter(({ base, overlapping }) => base.id < overlapping.id)
    .map(({ base, overlapping }) => {
      const staffName = staff.find((member) => member.id === base.staffId)?.name ?? "Unknown";

      return {
        id: base.id,
        staff: staffName,
        day: dayLabels[base.dayIndex] ?? "",
        detail: `${base.role} · ${formatShiftTime(base.start, base.end)} and ${formatShiftTime(overlapping.start, overlapping.end)}`,
        cause: `${staffName} has two overlapping shifts.`,
        guidance: "Review the times or assign one shift to another staff member.",
      };
    });
}
