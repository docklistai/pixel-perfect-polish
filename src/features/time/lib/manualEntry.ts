/**
 * Validates the Add Time Entry dialog's inputs and builds the exact payload
 * `createTimeEntryFn` requires, or an honest error message when the input
 * can't be trusted. Pure and testable; the hook handles the toast + write.
 * Times are wall-clock in the venue timezone against the chosen work date,
 * matching the adjustment path, so approvals and export see exact instants.
 */

import { parseBreakMinutes, parseClockField, wallTimeToIso } from "./adjustTime";

export interface ManualEntryInput {
  staffMemberId: string;
  workDate: string;
  clockIn: string;
  clockOut: string;
  finishesNextDay: boolean;
  breakTime: string;
  note: string;
  /** Venue timezone the wall-clock times are typed in. */
  timezone: string;
}

export interface ManualEntryPayload {
  staffMemberId: string;
  workDate: string;
  clockedInAt: string;
  clockedOutAt: string;
  breakMinutes: number;
  reason: string;
}

export type PreparedManualEntry =
  | { ok: true; payload: ManualEntryPayload }
  | { ok: false; message: string };

const DATE_ISO = /^\d{4}-\d{2}-\d{2}$/;

/** Recorded on the entry's audit-trail event when the manager leaves no note. */
export const DEFAULT_MANUAL_ENTRY_REASON = "Manual time entry recorded by manager";

function invalid(message: string): PreparedManualEntry {
  return { ok: false, message };
}

function addOneDay(dateIso: string): string {
  const date = new Date(`${dateIso}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

function workedMinutes(clockedInAt: string, clockedOutAt: string): number {
  return Math.round((Date.parse(clockedOutAt) - Date.parse(clockedInAt)) / 60_000);
}

export function prepareManualEntry(input: ManualEntryInput): PreparedManualEntry {
  if (!input.staffMemberId) return invalid("Choose a staff member.");

  const workDate = input.workDate.trim();
  if (!DATE_ISO.test(workDate)) return invalid("Choose a work date.");

  const inField = parseClockField(input.clockIn);
  const outField = parseClockField(input.clockOut);
  if (inField === null || outField === null) {
    return invalid("Enter clock-in and clock-out as HH:MM.");
  }

  const breakMinutes = parseBreakMinutes(input.breakTime);
  if (breakMinutes === null) return invalid("Enter the break as H:MM.");

  const startMinutes = inField.hours * 60 + inField.minutes;
  const endMinutes = outField.hours * 60 + outField.minutes;
  if (!input.finishesNextDay && endMinutes <= startMinutes) {
    return invalid("Clock-out must be after clock-in.");
  }

  let clockedInAt: string;
  let clockedOutAt: string;
  try {
    clockedInAt = wallTimeToIso(workDate, inField.hours, inField.minutes, input.timezone);
    const clockOutDate = input.finishesNextDay ? addOneDay(workDate) : workDate;
    clockedOutAt = wallTimeToIso(clockOutDate, outField.hours, outField.minutes, input.timezone);
  } catch (error) {
    // wallTimeToIso only ever throws its own hand-authored, specific text
    // (e.g. a DST-gap explanation) — never a server or database round trip —
    // so surfacing it verbatim is safe and more useful than a generic fallback.
    return invalid(error instanceof Error ? error.message : "Choose valid local clock times.");
  }
  const durationMinutes = workedMinutes(clockedInAt, clockedOutAt);
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    return invalid("Clock-out must be after clock-in.");
  }
  if (breakMinutes >= durationMinutes) {
    return invalid("The break can't be as long as the time worked.");
  }

  const note = input.note.trim();
  if (note.length > 2000) return invalid("Keep the note under 2000 characters.");

  return {
    ok: true,
    payload: {
      staffMemberId: input.staffMemberId,
      workDate,
      clockedInAt,
      clockedOutAt,
      breakMinutes,
      reason: note || DEFAULT_MANUAL_ENTRY_REASON,
    },
  };
}
