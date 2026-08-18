import type { TimeExceptionCode } from "./timeExceptions";

/** Shapes for the Time Pulse board. Derivation rules live in `timePulse.ts`. */

export type TimePulseState =
  | "scheduled_upcoming"
  | "not_clocked_in"
  | "on_site"
  | "on_break"
  | "checked_out";

export interface TimePulseShiftInput {
  sourceShiftId: string;
  staffMemberId: string;
  staffName: string;
  roleName: string | null;
  locationId: string;
  locationName: string | null;
  timezone: string;
  startsAt: string;
  endsAt: string;
}

export interface TimePulseEntryInput {
  id: string;
  staffMemberId: string;
  /** `time_entries.shift_id`, matching `published_rota_shifts.source_shift_id`. */
  shiftId: string | null;
  scheduledStartAt: string | null;
  scheduledEndAt: string | null;
  clockedInAt: string | null;
  clockedOutAt: string | null;
  /** True when clock events leave a break open right now. */
  onOpenBreak: boolean;
}

export interface TimePulseRow {
  key: string;
  staffMemberId: string;
  staffName: string;
  roleName: string | null;
  locationId: string | null;
  locationName: string | null;
  timezone: string;
  state: TimePulseState;
  /** Factual label: "Starts at 10:00", "On site", "Not clocked in", … */
  label: string;
  scheduledStartAt: string | null;
  scheduledEndAt: string | null;
  clockedInAt: string | null;
  clockedOutAt: string | null;
  /** Present without a matching published shift. */
  isUnscheduled: boolean;
  /** Clocked in later than the shared grace allows. Never a score. */
  isLateClockIn: boolean;
  exceptionCodes: TimeExceptionCode[];
}

export interface TimePulseLocationContext {
  locationId: string;
  locationName: string | null;
  timezone: string;
}

export interface TimePulseInput {
  shifts: TimePulseShiftInput[];
  entries: TimePulseEntryInput[];
  now: Date;
  /** Fallback timezone for attendance that matches no published shift. */
  fallbackTimezone: string;
  /** Display names, needed for attendance that matches no published shift. */
  staffNames?: Map<string, string>;
  /** Location context for unscheduled attendance, when it can be resolved. */
  staffLocations?: Map<string, TimePulseLocationContext>;
}
