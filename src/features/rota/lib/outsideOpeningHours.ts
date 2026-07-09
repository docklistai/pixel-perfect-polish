import type { DraftShift } from "../types";

/** "HH:MM" → minutes from midnight, or null when unparseable/invalid. */
function toMinutes(hhmm: string): number | null {
  const match = /^(\d{1,2}):(\d{2})/.exec(hhmm.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

/**
 * Conservative out-of-hours check. Returns true ONLY when both the venue window
 * and the shift fit within a single day (no midnight wrap) and the shift clearly
 * starts before open or ends after close. Overnight venues or overnight shifts
 * return false — we never guess, so there are never false warnings.
 */
export function isOutsideOpeningHours(
  shift: { start: string; end: string },
  open: string,
  close: string,
): boolean {
  const openMin = toMinutes(open);
  const closeMin = toMinutes(close);
  const startMin = toMinutes(shift.start);
  const endMin = toMinutes(shift.end);
  if (openMin === null || closeMin === null || startMin === null || endMin === null) return false;
  if (closeMin <= openMin) return false; // overnight venue — can't safely judge
  if (endMin <= startMin) return false; // overnight shift — can't safely judge
  return startMin < openMin || endMin > closeMin;
}

export type OutsideHoursShift = { shiftId: string; role: string };

export function buildOutsideHoursShifts(
  shifts: DraftShift[],
  openTime: string | null,
  closeTime: string | null,
): OutsideHoursShift[] {
  if (!openTime || !closeTime) return [];
  const result: OutsideHoursShift[] = [];
  for (const shift of shifts) {
    if (isOutsideOpeningHours(shift, openTime, closeTime)) {
      result.push({ shiftId: shift.id, role: shift.deptOverride ?? shift.role });
    }
  }
  return result;
}
