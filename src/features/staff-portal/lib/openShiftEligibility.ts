import type { PortalOpenShift } from "../api/openShiftRequests";
import { isoWeekday } from "@/features/rota/lib/recurringDayOffClashes";

interface LeaveRange {
  startIso: string;
  endIso: string;
}

export interface PortalOpenShiftConstraints {
  approvedLeave?: LeaveRange[];
  blockingLeave?: LeaveRange[];
  approvedRecurringWeekdays: Set<number>;
  approvedUnavailableDates: Set<string>;
}

export function filterEligibleOpenShifts(
  shifts: PortalOpenShift[],
  constraints: PortalOpenShiftConstraints,
): PortalOpenShift[] {
  const activeLeave = constraints.blockingLeave ?? constraints.approvedLeave ?? [];
  return shifts.filter((shift) => {
    const dates = shift.date === shift.endDate ? [shift.date] : [shift.date, shift.endDate];
    return !dates.some(
      (date) =>
        constraints.approvedUnavailableDates.has(date) ||
        constraints.approvedRecurringWeekdays.has(isoWeekday(date)) ||
        activeLeave.some((leave) => leave.startIso <= date && leave.endIso >= date),
    );
  });
}
