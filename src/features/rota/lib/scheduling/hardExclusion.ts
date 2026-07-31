import type { LocalShiftTimes } from "./calendarInterval";

/**
 * The vocabulary of automatic scheduling: what a candidate is, what they are
 * already committed to, and the reasons they can be refused.
 *
 * These types are separated from the rules that apply them so both the planner
 * and the surfaces that only need to *name* an outcome (messages, review UI)
 * can import them without pulling in the decision engine.
 *
 * The split that matters is between a **hard exclusion**, which removes a
 * candidate outright, and a **balancing signal**, which only changes the order
 * candidates are considered in. A balancing signal can never exclude anyone, and
 * a hard exclusion is never softened into a preference.
 */

/** Why a candidate cannot take a shift automatically. */
export type HardExclusion =
  | "role-mismatch"
  | "inactive"
  | "approved-leave"
  | "pending-leave"
  | "recurring-day-off"
  | "one-off-unavailable"
  | "interval-conflict"
  | "unreadable-times";

/** Signals that reorder candidates. None of these can exclude anyone. */
export type BalancingSignal = "current-load" | "contracted-minutes" | "department-affinity";

export type StaffSchedulingFact = {
  id: string;
  name: string;
  /** Already normalized by `normaliseRoleKey`. Compared with exact equality. */
  roleKey: string;
  departmentId: string | null;
  active: boolean;
  /** Soft signal only. `null` means "no target", never "no shifts". */
  contractedMinutesPerWeek: number | null;
};

/** A shift a person is already committed to, for interval comparison. */
export type CommittedShift = {
  shiftId: string;
  staffId: string;
  times: LocalShiftTimes;
};

/**
 * Approved and pending scheduling constraints, pre-indexed by staff id.
 *
 * Pending leave is carried separately from approved so the two can be reported
 * distinctly, but both are hard exclusions for a *new automatic* assignment: the
 * planner must not quietly schedule over a request a manager has not answered
 * yet. An existing assignment is never removed for this reason — it is warned.
 */
export type AvailabilityFacts = {
  approvedLeaveDatesByStaff: Map<string, Set<string>>;
  pendingLeaveDatesByStaff: Map<string, Set<string>>;
  /** Weekdays 0 = Monday .. 6 = Sunday, matching `staff_recurring_day_off_requests`. */
  recurringWeekdaysByStaff: Map<string, Set<number>>;
  unavailableDatesByStaff: Map<string, Set<string>>;
};

export function emptyAvailabilityFacts(): AvailabilityFacts {
  return {
    approvedLeaveDatesByStaff: new Map(),
    pendingLeaveDatesByStaff: new Map(),
    recurringWeekdaysByStaff: new Map(),
    unavailableDatesByStaff: new Map(),
  };
}
