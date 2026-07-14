/**
 * Live attendance exceptions are derived from scheduled and actual instants.
 * The fixed five-minute grace is intentionally product-wide for this batch;
 * it is not a tenant setting and must not drift between UI surfaces.
 */
export const TIME_EXCEPTION_GRACE_MINUTES = 5;

export type TimeExceptionCode =
  | "late-clock-in"
  | "early-clock-out"
  | "late-finish"
  | "missing-clock-out"
  | "incomplete-break"
  | "unscheduled-attendance";

export interface TimeExceptionDefinition {
  label: string;
  tone: "warning" | "danger" | "info";
}

export const TIME_EXCEPTION_DEFINITIONS: Record<TimeExceptionCode, TimeExceptionDefinition> = {
  "late-clock-in": { label: "Late clock-in", tone: "warning" },
  "early-clock-out": { label: "Early clock-out", tone: "warning" },
  "late-finish": { label: "Late finish", tone: "warning" },
  "missing-clock-out": { label: "Missing clock-out", tone: "danger" },
  "incomplete-break": { label: "Incomplete break", tone: "danger" },
  "unscheduled-attendance": { label: "Unscheduled attendance", tone: "info" },
};

export interface TimeExceptionInput {
  scheduledStartAt: string | null;
  scheduledEndAt: string | null;
  clockedInAt: string | null;
  clockedOutAt: string | null;
  /** Derived from immutable clock-event pairing when those events are loaded. */
  hasIncompleteBreak?: boolean;
  now?: Date;
}

function validInstant(value: string | null): number | null {
  if (!value) return null;
  const instant = Date.parse(value);
  return Number.isFinite(instant) ? instant : null;
}

/** Positive when `actual` is after `scheduled`, retaining sub-minute precision. */
export function minuteDelta(actual: string | null, scheduled: string | null): number | null {
  const actualMs = validInstant(actual);
  const scheduledMs = validInstant(scheduled);
  if (actualMs === null || scheduledMs === null) return null;
  return (actualMs - scheduledMs) / 60_000;
}

/**
 * Derive all applicable exception codes. Absolute instants make overnight and
 * cross-timezone comparisons deterministic; formatting remains a separate UI concern.
 */
export function deriveTimeExceptions(input: TimeExceptionInput): TimeExceptionCode[] {
  const exceptions: TimeExceptionCode[] = [];
  const scheduledStartMs = validInstant(input.scheduledStartAt);
  const scheduledEndMs = validInstant(input.scheduledEndAt);
  const clockedInMs = validInstant(input.clockedInAt);
  const clockedOutMs = validInstant(input.clockedOutAt);
  const graceMs = TIME_EXCEPTION_GRACE_MINUTES * 60_000;

  if (scheduledStartMs === null || scheduledEndMs === null) {
    exceptions.push("unscheduled-attendance");
  } else {
    if (clockedInMs !== null && clockedInMs > scheduledStartMs + graceMs) {
      exceptions.push("late-clock-in");
    }
    if (clockedOutMs !== null && clockedOutMs < scheduledEndMs - graceMs) {
      exceptions.push("early-clock-out");
    }
    if (clockedOutMs !== null && clockedOutMs > scheduledEndMs + graceMs) {
      exceptions.push("late-finish");
    }
    if (
      clockedInMs !== null &&
      clockedOutMs === null &&
      (input.now?.getTime() ?? Date.now()) > scheduledEndMs + graceMs
    ) {
      exceptions.push("missing-clock-out");
    }
  }

  if (input.hasIncompleteBreak) exceptions.push("incomplete-break");
  return exceptions;
}

export interface BreakEventLike {
  id: string;
  eventType: "clock_in" | "clock_out" | "break_start" | "break_end";
  occurredAt: string;
}

/** True when break starts/ends are out of sequence or one remains open. */
export function hasIncompleteBreak(events: BreakEventLike[]): boolean {
  let openBreak = false;
  const ordered = [...events].sort(
    (a, b) => Date.parse(a.occurredAt) - Date.parse(b.occurredAt) || a.id.localeCompare(b.id),
  );
  for (const event of ordered) {
    if (event.eventType === "break_start") {
      if (openBreak) return true;
      openBreak = true;
    } else if (event.eventType === "break_end") {
      if (!openBreak) return true;
      openBreak = false;
    }
  }
  return openBreak;
}

export function hasTimeException(row: {
  exceptionCodes?: TimeExceptionCode[];
  exc: string;
}): boolean {
  return row.exceptionCodes ? row.exceptionCodes.length > 0 : row.exc !== "—";
}
