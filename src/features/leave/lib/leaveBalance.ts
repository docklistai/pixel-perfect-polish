/**
 * Leave balance arithmetic.
 *
 * The unit is the CALENDAR DAY. `leave_requests` stores whole-date ranges and
 * Docklist holds no per-person working pattern, so a "day" here is a calendar
 * date inside a request. Nothing in this module consults
 * `workspaces.open_weekdays_mask` (that is when the business trades, not when a
 * person works), contracted minutes, rota shifts, weekday assumptions or public
 * holidays. Every surface that renders these numbers states the unit.
 *
 * Days are counted as a UNION OF DISTINCT DATES, never as a sum of per-request
 * durations. Two overlapping approved requests are structurally reachable —
 * `rpc_submit_leave_request` has no overlap guard and approval performs no
 * leave-vs-leave check — so summing would double-count real data. Clipping each
 * request to the leave-year window before the union also gives correct
 * behaviour for a request that straddles a leave-year boundary, splitting its
 * days across the two years rather than counting them twice.
 */

import type { LeaveYearWindow } from "./leaveYear";

/** Persisted `leave_requests.leave_type` values. */
export type LeaveTypeValue = "annual_leave" | "personal" | "sick" | "unpaid" | "other";

/** Persisted `leave_requests.status` values. */
export type LeaveStatusValue = "pending" | "approved" | "declined" | "cancelled";

/** The minimum shape balance arithmetic needs from a leave request. */
export interface BalanceLeaveRequest {
  startIso: string;
  endIso: string;
  leaveType: string;
  status: string;
}

export interface LeaveBalance {
  /** False when no entitlement has been recorded for this person and year. */
  recorded: boolean;
  /** Manager-stated entitlement in calendar days; null when not recorded. */
  entitlementDays: number | null;
  /** Distinct calendar days of APPROVED annual leave inside the leave year. */
  booked: number;
  /** Distinct calendar days of PENDING annual leave inside the leave year. */
  pending: number;
  /**
   * entitlement − booked. Null when not recorded. Deliberately NOT clamped at
   * zero: a negative remaining means more leave has been approved than was
   * recorded, which is information a manager needs rather than something to
   * hide behind a floor.
   */
  remaining: number | null;
}

/**
 * The single place that decides whether a leave type consumes annual
 * entitlement. Exactly one type does. This is a hard-coded product rule, not a
 * configurable policy: there is no flag column and no policy engine, and adding
 * a second consuming type is a deliberate one-line change here.
 */
export function isEntitlementConsumingLeaveType(leaveType: string): boolean {
  return leaveType === "annual_leave";
}

const DAY_MS = 86_400_000;

function parseIsoToUtcMs(iso: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const ms = Date.parse(`${iso}T00:00:00Z`);
  return Number.isFinite(ms) ? ms : null;
}

/**
 * The portion of [startIso, endIso] that falls inside the window, or null when
 * they do not intersect. ISO date strings compare lexicographically in
 * chronological order, so the clamp needs no date parsing.
 */
export function clipRangeToWindow(
  startIso: string,
  endIso: string,
  window: LeaveYearWindow,
): { startIso: string; endIso: string } | null {
  if (endIso < startIso) return null;
  const start = startIso > window.startIso ? startIso : window.startIso;
  const end = endIso < window.endIso ? endIso : window.endIso;
  if (start > end) return null;
  return { startIso: start, endIso: end };
}

/**
 * Distinct calendar dates covered by the given requests inside the window.
 *
 * Each request is clipped to the window before its dates are enumerated, so the
 * work per request is bounded by the length of a leave year regardless of how
 * long the stored range is.
 */
export function countDistinctLeaveDays(
  requests: BalanceLeaveRequest[],
  window: LeaveYearWindow,
  status: LeaveStatusValue,
): number {
  const dates = new Set<string>();

  for (const request of requests) {
    if (request.status !== status) continue;
    if (!isEntitlementConsumingLeaveType(request.leaveType)) continue;

    const clipped = clipRangeToWindow(request.startIso, request.endIso, window);
    if (!clipped) continue;

    const startMs = parseIsoToUtcMs(clipped.startIso);
    const endMs = parseIsoToUtcMs(clipped.endIso);
    if (startMs === null || endMs === null) continue;

    for (let ms = startMs; ms <= endMs; ms += DAY_MS) {
      dates.add(new Date(ms).toISOString().slice(0, 10));
    }
  }

  return dates.size;
}

/**
 * Booked, pending and remaining for one person in one leave year.
 *
 * `entitlementDays` is the person's own recorded row and nothing else. A
 * workspace default is never substituted here: an unrecorded person reads as
 * `recorded: false`, so the manager view and the staff portal show the same
 * authoritative answer instead of one of them inventing a plausible number.
 */
export function calculateLeaveBalance(input: {
  entitlementDays: number | null;
  requests: BalanceLeaveRequest[];
  window: LeaveYearWindow;
}): LeaveBalance {
  const booked = countDistinctLeaveDays(input.requests, input.window, "approved");
  const pending = countDistinctLeaveDays(input.requests, input.window, "pending");
  const recorded = input.entitlementDays !== null;

  return {
    recorded,
    entitlementDays: input.entitlementDays,
    booked,
    pending,
    remaining: recorded ? (input.entitlementDays as number) - booked : null,
  };
}
