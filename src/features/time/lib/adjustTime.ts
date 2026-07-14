/**
 * Helpers for turning the manager adjust-dialog's wall-clock inputs into the
 * exact UTC instants `rpc_adjust_time_entry` requires. Times are interpreted in
 * the entry's venue timezone (the staff member's location, workspace fallback)
 * against the entry's own work date, so a "08:00" typed for a London venue
 * resolves to the correct instant across DST boundaries.
 */

import { zonedLocalTimeToUtcIso } from "@/features/rota/lib/liveRotaDates";

const HHMM = /^(\d{1,2}):(\d{2})$/;
const MINUTES = /^(\d{1,4})\s*m$/i;

/** Break lengths the adjust dialog offers; the single source of truth. */
export const BREAK_OPTIONS = ["0:00", "0:15", "0:30", "0:45", "1:00"] as const;

/**
 * A wall-clock time (date + hour/minute) in the given venue timezone → UTC ISO
 * instant. Refines the offset once so the result is correct on either side of a
 * DST transition.
 */
export function wallTimeToIso(
  dateStr: string,
  hours: number,
  minutes: number,
  timeZone: string,
): string {
  const hhmm = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  return zonedLocalTimeToUtcIso(dateStr, hhmm, timeZone);
}

/** Parses an "HH:MM" clock field, or null when blank / not a valid time. */
export function parseClockField(value: string): { hours: number; minutes: number } | null {
  const trimmed = value.trim();
  if (trimmed === "" || trimmed === "—") return null;
  const match = HHMM.exec(trimmed);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return { hours, minutes };
}

/**
 * Parses a break length into minutes. Accepts both the dialog's "H:MM" option
 * values and the live row's "<n>m" format (e.g. "30m"); null when invalid.
 */
export function parseBreakMinutes(value: string): number | null {
  const trimmed = value.trim();
  const hhmm = HHMM.exec(trimmed);
  if (hhmm) {
    const minutes = Number(hhmm[1]) * 60 + Number(hhmm[2]);
    return minutes >= 0 && minutes <= 1440 ? minutes : null;
  }
  const mins = MINUTES.exec(trimmed);
  if (mins) {
    const minutes = Number(mins[1]);
    return minutes >= 0 && minutes <= 1440 ? minutes : null;
  }
  return null;
}

/**
 * Maps any break value (live "<n>m", demo "H:MM", or unparseable) to the
 * closest dialog option so the break `<select>` always shows a valid choice.
 * Defaults to "0:30" when the input can't be read.
 */
export function breakValueToOption(value: string): string {
  const minutes = parseBreakMinutes(value);
  if (minutes === null) return "0:30";
  let best: string = BREAK_OPTIONS[0];
  let bestDiff = Infinity;
  for (const option of BREAK_OPTIONS) {
    const diff = Math.abs(parseBreakMinutes(option)! - minutes);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = option;
    }
  }
  return best;
}
