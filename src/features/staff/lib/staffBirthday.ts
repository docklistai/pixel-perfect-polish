/**
 * Birthday day + month only. There is no year field anywhere in this flow —
 * the schema does not store one, so no age can be derived (ADR-0004).
 *
 * These rules mirror `staff_members_birthday_calendar_check` exactly, so the
 * form refuses what the database would refuse rather than round-tripping to a
 * server error.
 */

export const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
] as const;

/** Days in a month, ignoring leap years — 29 February is always allowed. */
export function daysInMonth(month: number): number {
  if (month === 2) return 29;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

export interface BirthdayValue {
  day: string;
  month: string;
}

export type BirthdayParse =
  | { ok: true; day: number | null; month: number | null }
  | { ok: false; message: string };

/**
 * Parses the two form fields. Empty + empty clears the birthday; anything
 * half-filled is refused, matching the paired NOT NULL constraint.
 */
export function parseBirthday({ day, month }: BirthdayValue): BirthdayParse {
  const dayText = day.trim();
  const monthText = month.trim();

  if (dayText === "" && monthText === "") return { ok: true, day: null, month: null };
  if (dayText === "" || monthText === "") {
    return { ok: false, message: "Enter both a day and a month, or leave both empty." };
  }

  const dayValue = Number(dayText);
  const monthValue = Number(monthText);
  if (!Number.isInteger(dayValue) || !Number.isInteger(monthValue)) {
    return { ok: false, message: "Enter a whole day and month." };
  }
  if (monthValue < 1 || monthValue > 12) {
    return { ok: false, message: "Choose a month." };
  }
  if (dayValue < 1 || dayValue > daysInMonth(monthValue)) {
    const name = MONTHS.find((entry) => entry.value === monthValue)?.label ?? "that month";
    return { ok: false, message: `${name} has ${daysInMonth(monthValue)} days.` };
  }
  return { ok: true, day: dayValue, month: monthValue };
}

/** True when the parsed pair differs from what is already stored. */
export function birthdayChanged(
  parsed: { day: number | null; month: number | null },
  storedDay: number | null | undefined,
  storedMonth: number | null | undefined,
): boolean {
  return parsed.day !== (storedDay ?? null) || parsed.month !== (storedMonth ?? null);
}
