/**
 * Helpers for turning the manager adjust-dialog's wall-clock inputs into the
 * exact UTC instants `rpc_adjust_time_entry` requires. Times are interpreted in
 * the workspace timezone against the entry's own work date, so a "08:00" typed
 * in London resolves to the correct instant across DST boundaries.
 */

const WORKSPACE_TZ = "Europe/London";
const HHMM = /^(\d{1,2}):(\d{2})$/;
const MINUTES = /^(\d{1,4})\s*m$/i;

/** Break lengths the adjust dialog offers; the single source of truth. */
export const BREAK_OPTIONS = ["0:00", "0:15", "0:30", "0:45", "1:00"] as const;

/** Offset (ms) the timezone is ahead of UTC at the given UTC instant. */
function tzOffsetMs(timeZone: string, utcMs: number): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(utcMs));
  const part = (type: string) => Number(parts.find((p) => p.type === type)!.value);
  const asUtc = Date.UTC(
    part("year"),
    part("month") - 1,
    part("day"),
    part("hour"),
    part("minute"),
    part("second"),
  );
  return asUtc - utcMs;
}

/**
 * A wall-clock time (date + hour/minute) in the workspace timezone → UTC ISO
 * instant. Refines the offset once so the result is correct on either side of a
 * DST transition.
 */
export function workspaceWallTimeToIso(dateStr: string, hours: number, minutes: number): string {
  const guess = Date.UTC(
    Number(dateStr.slice(0, 4)),
    Number(dateStr.slice(5, 7)) - 1,
    Number(dateStr.slice(8, 10)),
    hours,
    minutes,
  );
  const offset = tzOffsetMs(WORKSPACE_TZ, guess);
  let utc = guess - offset;
  const refinedOffset = tzOffsetMs(WORKSPACE_TZ, utc);
  if (refinedOffset !== offset) utc = guess - refinedOffset;
  return new Date(utc).toISOString();
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
