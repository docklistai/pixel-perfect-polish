import type { PortalOpenShift } from "../api/openShiftRequests";
import { isoWeekday } from "@/features/rota/lib/recurringDayOffClashes";

interface ApprovedLeaveRange {
  startIso: string;
  endIso: string;
}

export interface PortalOpenShiftConstraints {
  approvedLeave: ApprovedLeaveRange[];
  approvedRecurringWeekdays: Set<number>;
  approvedUnavailableDates: Set<string>;
}

export function filterEligibleOpenShifts(
  shifts: PortalOpenShift[],
  constraints: PortalOpenShiftConstraints,
): PortalOpenShift[] {
  return shifts.filter((shift) => {
    const dates = shift.date === shift.endDate ? [shift.date] : [shift.date, shift.endDate];
    return !dates.some(
      (date) =>
        constraints.approvedUnavailableDates.has(date) ||
        constraints.approvedRecurringWeekdays.has(isoWeekday(date)) ||
        constraints.approvedLeave.some((leave) => leave.startIso <= date && leave.endIso >= date),
    );
  });
}
