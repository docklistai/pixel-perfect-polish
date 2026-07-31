import type { StaffMember } from "../types";
import type { LeaveRequest } from "@/features/leave/types";
import type { ApprovedAvailabilityConstraints } from "./availabilityConstraints";
import { normaliseRoleKey } from "./scheduling/shiftSignature";
import {
  emptyAvailabilityFacts,
  type AvailabilityFacts,
  type StaffSchedulingFact,
} from "./scheduling/eligibility";

/**
 * Adapters from the rota page's loaded data to the shared eligibility engine.
 *
 * The automatic open-shift fill this file was named for is gone — Build the Week
 * replaced it, and asks the engine directly. What survives is the translation
 * these two functions do, which the recovery suggestions still depend on.
 */

export type OpenShiftFillOptions = {
  leaveRequests?: LeaveRequest[];
  dayIsoDates?: string[];
  /** Approved recurring days off and one-off unavailability, as loaded by the rota page. */
  constraints?: ApprovedAvailabilityConstraints;
};

/**
 * Adapts the rota page's loaded data into the shared eligibility engine's facts.
 *
 * Leave is indexed by the dates it actually covers within this week, so the engine
 * can test an overnight shift against both the date it starts on and the date it
 * ends on. The former hand-rolled check looked at the start date only.
 */
export function toAvailabilityFacts(options: OpenShiftFillOptions): AvailabilityFacts {
  const facts = emptyAvailabilityFacts();
  const dates = options.dayIsoDates ?? [];
  // Leave can start before and end after this week, so every in-week date is
  // tested against each request's range rather than matching on endpoints.
  const inWeekDates = [...new Set(dates.filter(Boolean))];

  for (const request of options.leaveRequests ?? []) {
    if (request.state !== "approved" && request.state !== "pending") continue;
    const target =
      request.state === "approved"
        ? facts.approvedLeaveDatesByStaff
        : facts.pendingLeaveDatesByStaff;
    const bucket = target.get(request.staffId) ?? new Set<string>();
    for (const date of inWeekDates) {
      if (request.startIso <= date && request.endIso >= date) bucket.add(date);
    }
    // An overnight shift on the final column ends on the day after the week, so
    // that date has to be testable too.
    const dayAfterWeek = dates.length > 0 ? nextDate(dates[dates.length - 1]!) : null;
    if (dayAfterWeek && request.startIso <= dayAfterWeek && request.endIso >= dayAfterWeek) {
      bucket.add(dayAfterWeek);
    }
    if (bucket.size > 0) target.set(request.staffId, bucket);
  }

  const constraints = options.constraints;
  if (constraints) {
    facts.recurringWeekdaysByStaff = constraints.recurringByStaff;
    facts.unavailableDatesByStaff = constraints.unavailableDatesByStaff;
  }

  return facts;
}

function nextDate(isoDate: string): string {
  const parsed = Date.parse(`${isoDate}T12:00:00Z`);
  if (!Number.isFinite(parsed)) return isoDate;
  return new Date(parsed + 86_400_000).toISOString().slice(0, 10);
}

export function toStaffSchedulingFact(member: StaffMember): StaffSchedulingFact {
  return {
    id: member.id,
    name: member.name,
    roleKey: normaliseRoleKey(member.role),
    departmentId: member.departmentId ?? null,
    active: true,
    contractedMinutesPerWeek: member.contractedMinutesPerWeek ?? null,
  };
}
