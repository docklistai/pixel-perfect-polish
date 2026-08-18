import { deriveTimeExceptions, TIME_EXCEPTION_GRACE_MINUTES } from "./timeExceptions";
import { formatClockTime } from "./timePulseFormat";
import { selectEntriesByShift } from "./timePulseSessions";
import type {
  TimePulseEntryInput,
  TimePulseInput,
  TimePulseRow,
  TimePulseShiftInput,
  TimePulseState,
} from "./timePulseTypes";

/**
 * Time Pulse — "who should be here right now, and what does the clock say?".
 *
 * Pure derivation over already-joined published shifts and clock records, so
 * every rule here is unit-testable and free of React and Supabase.
 *
 * Two boundaries this file deliberately holds:
 *
 *   1. Every comparison is between absolute instants. Published shifts carry
 *      `timestamptz` starts/ends, so overnight shifts and locations in
 *      different timezones need no date arithmetic and no local-midnight
 *      instant, which would be ambiguous on DST days.
 *   2. Lateness is only ever `TIME_EXCEPTION_GRACE_MINUTES` applied to a
 *      scheduled start, reusing the shared derivation. There is no second
 *      threshold, no score, no ranking, and nothing here is persisted — these
 *      values are computed per request and thrown away.
 */

function stateLabel(state: TimePulseState, startsAt: string | null, timezone: string): string {
  switch (state) {
    case "scheduled_upcoming":
      return startsAt ? `Starts at ${formatClockTime(startsAt, timezone)}` : "Scheduled";
    case "not_clocked_in":
      return "Not clocked in";
    case "on_site":
      return "On site";
    case "on_break":
      return "On break";
    case "checked_out":
      return "Checked out";
  }
}

function clockState(entry: TimePulseEntryInput | undefined): TimePulseState | null {
  if (!entry || entry.clockedInAt === null) return null;
  if (entry.clockedOutAt !== null) return "checked_out";
  return entry.onOpenBreak ? "on_break" : "on_site";
}

function buildRow(
  key: string,
  shift: TimePulseShiftInput | null,
  entry: TimePulseEntryInput | undefined,
  identity: { staffMemberId: string; staffName: string; roleName: string | null },
  context: { locationId: string | null; locationName: string | null; timezone: string },
  now: Date,
): TimePulseRow {
  const scheduledStartAt = shift?.startsAt ?? entry?.scheduledStartAt ?? null;
  const scheduledEndAt = shift?.endsAt ?? entry?.scheduledEndAt ?? null;
  const clockedInAt = entry?.clockedInAt ?? null;
  const clockedOutAt = entry?.clockedOutAt ?? null;

  const fromClock = clockState(entry);
  const state: TimePulseState =
    fromClock ??
    (scheduledStartAt !== null && now.getTime() < Date.parse(scheduledStartAt)
      ? "scheduled_upcoming"
      : "not_clocked_in");

  const exceptionCodes = deriveTimeExceptions({
    scheduledStartAt,
    scheduledEndAt,
    clockedInAt,
    clockedOutAt,
    now,
  });

  return {
    key,
    staffMemberId: identity.staffMemberId,
    staffName: identity.staffName,
    roleName: identity.roleName,
    locationId: context.locationId,
    locationName: context.locationName,
    timezone: context.timezone,
    state,
    label: stateLabel(state, scheduledStartAt, context.timezone),
    scheduledStartAt,
    scheduledEndAt,
    clockedInAt,
    clockedOutAt,
    isUnscheduled: shift === null,
    isLateClockIn: exceptionCodes.includes("late-clock-in"),
    exceptionCodes,
  };
}

/**
 * One row per published shift on the board, plus a row for any attendance that
 * matches no published shift. Sorted by scheduled start so the board reads as a
 * day, with unscheduled attendance last.
 */
export function buildTimePulse(input: TimePulseInput): TimePulseRow[] {
  const { shifts, entries, now, fallbackTimezone } = input;
  const entryByShiftId = selectEntriesByShift(entries);

  const scheduledRows = shifts.map((shift) =>
    buildRow(
      `shift:${shift.sourceShiftId}`,
      shift,
      entryByShiftId.get(shift.sourceShiftId),
      {
        staffMemberId: shift.staffMemberId,
        staffName: shift.staffName,
        roleName: shift.roleName,
      },
      {
        locationId: shift.locationId,
        locationName: shift.locationName,
        timezone: shift.timezone,
      },
      now,
    ),
  );

  // Unscheduled means the person has no scheduled shift at all, never merely
  // "did not match a row we happen to be rendering". An entry that carries a
  // shift id was scheduled, so it is either represented by its own shift row or
  // it does not belong on today's board — it must never be relabelled.
  const unscheduledRows = entries
    .filter((entry) => entry.shiftId === null && entry.clockedInAt !== null)
    .map((entry) => {
      const location = input.staffLocations?.get(entry.staffMemberId) ?? null;
      return buildRow(
        `entry:${entry.id}`,
        null,
        entry,
        {
          staffMemberId: entry.staffMemberId,
          staffName: input.staffNames?.get(entry.staffMemberId) ?? "Team member",
          roleName: null,
        },
        {
          locationId: location?.locationId ?? null,
          locationName: location?.locationName ?? null,
          timezone: location?.timezone ?? fallbackTimezone,
        },
        now,
      );
    });

  const sortKey = (row: TimePulseRow) =>
    row.scheduledStartAt ? Date.parse(row.scheduledStartAt) : Number.MAX_SAFE_INTEGER;
  return [...scheduledRows, ...unscheduledRows].sort(
    (left, right) =>
      sortKey(left) - sortKey(right) || left.staffName.localeCompare(right.staffName),
  );
}

/** Re-exported so consumers cannot introduce a second lateness threshold. */
export { TIME_EXCEPTION_GRACE_MINUTES };
