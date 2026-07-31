import { intervalDurationMinutes, toAbsoluteInterval } from "./calendarInterval";
import type { CommittedShift, StaffSchedulingFact } from "./hardExclusion";

/**
 * Balancing signals: how eligible candidates are ordered.
 *
 * Nothing in this file can refuse anybody. Every person reaching it has already
 * passed {@link hardExclusionFor}; all that remains is choosing between people
 * who are all allowed to work the shift. Keeping that apart from the exclusion
 * rules is what stops a preference from quietly hardening into a limit —
 * contracted minutes are a fairness hint here, and are never described as a
 * legal working-time cap.
 */

/** Scheduled minutes for one person across the shifts they are committed to. */
export function scheduledMinutesFor(staffId: string, committed: readonly CommittedShift[]): number {
  let total = 0;
  for (const shift of committed) {
    if (shift.staffId !== staffId) continue;
    const interval = toAbsoluteInterval(shift.times);
    if (interval) total += intervalDurationMinutes(interval);
  }
  return total;
}

export type Candidate = {
  staff: StaffSchedulingFact;
  scheduledMinutes: number;
};

/**
 * Total order over eligible candidates. Deterministic for identical inputs, which
 * is what makes the whole proposal reproducible.
 *
 * 1. fewest scheduled minutes this week — spread the work;
 * 2. most contracted headroom, **only when both people have a contracted figure**
 *    — a `null` contract is neutral, never a penalty, so someone with no recorded
 *    target is neither favoured nor pushed to the back;
 * 3. the shift's own department matches the person's — a suitability hint only;
 * 4. staff id, so the order is total and never depends on input sequence.
 */
export function compareCandidates(
  left: Candidate,
  right: Candidate,
  targetDepartmentId: string,
): number {
  if (left.scheduledMinutes !== right.scheduledMinutes) {
    return left.scheduledMinutes - right.scheduledMinutes;
  }

  const leftContract = left.staff.contractedMinutesPerWeek;
  const rightContract = right.staff.contractedMinutesPerWeek;
  if (leftContract !== null && rightContract !== null) {
    const leftHeadroom = leftContract - left.scheduledMinutes;
    const rightHeadroom = rightContract - right.scheduledMinutes;
    if (leftHeadroom !== rightHeadroom) return rightHeadroom - leftHeadroom;
  }

  const leftAffinity = left.staff.departmentId === targetDepartmentId ? 1 : 0;
  const rightAffinity = right.staff.departmentId === targetDepartmentId ? 1 : 0;
  if (leftAffinity !== rightAffinity) return rightAffinity - leftAffinity;

  return left.staff.id < right.staff.id ? -1 : left.staff.id > right.staff.id ? 1 : 0;
}
