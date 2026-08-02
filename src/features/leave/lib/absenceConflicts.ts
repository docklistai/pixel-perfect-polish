import type { ConflictingShift, RecordedAbsence } from "../api/recordAbsence";

function formatShiftDay(isoDate: string): string {
  const parsed = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return isoDate;
  return parsed.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}

/** "Wed 5 Aug, Thu 6 Aug" — the days a recorded absence collides with. */
export function listConflictDays(shifts: readonly ConflictingShift[]): string {
  const days: string[] = [];
  for (const shift of shifts) {
    const label = formatShiftDay(shift.shift_date);
    if (!days.includes(label)) days.push(label);
  }
  return days.join(", ");
}

/**
 * One sentence naming the rota shifts a recorded absence overlaps, or null when
 * there are none. The shifts themselves are never changed by recording an
 * absence, so the copy says what the manager still has to do.
 */
export function describeAbsenceConflicts(absence: RecordedAbsence): string | null {
  const shifts = absence.conflicting_shifts ?? [];
  if (shifts.length === 0) return null;
  const days = listConflictDays(shifts);
  const noun = shifts.length === 1 ? "shift" : "shifts";
  return `${absence.staff_display_name} still has ${shifts.length} rota ${noun} (${days}). They were left unchanged — reassign or remove them.`;
}
