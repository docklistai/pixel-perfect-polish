import type { PublishDiffShift } from "./publishDiffTypes";

/** How a shift in the publish change review is worded. Presentation only. */

export const DEPARTMENT_UNSET = "—";

/** Formats HH:MM–HH:MM, marking an overnight shift rather than hiding the wrap. */
export function formatShiftTimeRange(start: string, end: string): string {
  // End at or before start can only mean the shift runs into the next day;
  // "16:00–00:00" and "22:00–06:00" are both legitimate stored values.
  const overnight = end <= start;
  return `${start}–${end}${overnight ? " (+1)" : ""}`;
}

/** "Sam Ellis", or "Open shift" when the shift carries no assignee. */
export function assignmentLabel(shift: PublishDiffShift): string {
  return shift.staffId === null ? "Open shift" : (shift.staffName ?? "Assigned staff");
}

/** The day's grid label, falling back to a number when labels are unavailable. */
export function dayLabelFor(dayIndex: number, dayLabels: readonly string[]): string {
  return dayLabels[dayIndex] ?? `Day ${dayIndex + 1}`;
}

/** "Sam Ellis — Thu 09:00–17:00 · Bartender · Bar". */
export function describePublishDiffShift(
  shift: PublishDiffShift,
  dayLabels: readonly string[],
): string {
  const who = assignmentLabel(shift);
  const day = dayLabelFor(shift.dayIndex, dayLabels);
  const role = shift.role.trim();
  const department = shift.departmentName?.trim();
  const suffix = [role, department && department !== role ? department : null]
    .filter(Boolean)
    .join(" · ");
  const range = formatShiftTimeRange(shift.start, shift.end);
  return suffix ? `${who} — ${day} ${range} · ${suffix}` : `${who} — ${day} ${range}`;
}
