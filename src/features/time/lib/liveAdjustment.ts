/**
 * Turns the manager adjust-dialog's wall-clock inputs into the exact payload
 * `rpc_adjust_time_entry` requires, or an honest error message when the input
 * can't be trusted. Pure and testable; the hook handles the toast + RPC. A row
 * without a work date or venue timezone is rejected here so live mode never
 * fakes a timestamp.
 */

import { addIsoDays } from "@/features/rota/lib/liveRotaDates";
import { parseBreakMinutes, parseClockField, wallTimeToIso } from "./adjustTime";
import type { StoredTimesheetRow, TimeAdjustment } from "../types";

export interface AdjustmentPayload {
  clockedInAt: string | null;
  clockedOutAt: string | null;
  breakMinutes: number;
  reason: string;
}

export type PreparedAdjustment =
  | { ok: true; payload: AdjustmentPayload }
  | { ok: false; message: string };

export function prepareAdjustment(
  row: StoredTimesheetRow,
  adjustment: TimeAdjustment,
): PreparedAdjustment {
  if (!row.workDate) {
    return {
      ok: false,
      message: "This timesheet is missing the date needed to set exact clock times.",
    };
  }
  if (!row.timezone) {
    return {
      ok: false,
      message: "This timesheet is missing the venue timezone needed to set exact clock times.",
    };
  }

  const inField = parseClockField(adjustment.clockIn);
  const outField = parseClockField(adjustment.clockOut);
  const inBlank = adjustment.clockIn.trim() === "" || adjustment.clockIn.trim() === "—";
  const outBlank = adjustment.clockOut.trim() === "" || adjustment.clockOut.trim() === "—";
  const breakMinutes = parseBreakMinutes(adjustment.breakTime);

  if ((!inBlank && inField === null) || (!outBlank && outField === null)) {
    return { ok: false, message: "Enter clock times as HH:MM." };
  }
  if (breakMinutes === null) {
    return { ok: false, message: "Enter the break as H:MM." };
  }
  if (outField !== null && inField === null) {
    return { ok: false, message: "Add a clock-in time before setting a clock-out." };
  }

  const reason = adjustment.note.trim()
    ? `${adjustment.reason} — ${adjustment.note.trim()}`
    : adjustment.reason;
  const clockOutDate =
    inField &&
    outField &&
    outField.hours * 60 + outField.minutes < inField.hours * 60 + inField.minutes
      ? addIsoDays(row.workDate, 1)
      : row.workDate;

  try {
    return {
      ok: true,
      payload: {
        clockedInAt: inField
          ? wallTimeToIso(row.workDate, inField.hours, inField.minutes, row.timezone)
          : null,
        clockedOutAt: outField
          ? wallTimeToIso(clockOutDate, outField.hours, outField.minutes, row.timezone)
          : null,
        breakMinutes,
        reason,
      },
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Choose valid local clock times.",
    };
  }
}
