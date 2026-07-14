import * as React from "react";
import { useStaffOneOffUnavailability } from "@/features/staff/hooks/useStaffOneOffUnavailability";
import { useStaffRecurringDaysOff } from "@/features/staff/hooks/useStaffRecurringDaysOff";
import type { LeaveRequest } from "@/features/leave/types";
import { buildApprovedAvailabilityConstraints } from "../lib/availabilityConstraints";
import { buildRotaRecoveryOptions } from "../lib/rotaRecoveryOptions";
import type { DraftShift, StaffMember } from "../types";

export function useRotaRecoveryOptions(input: {
  shift: DraftShift | null;
  staff: StaffMember[];
  shifts: DraftShift[];
  leaveRequests: LeaveRequest[];
  dayIsoDates: string[];
}) {
  const recurring = useStaffRecurringDaysOff();
  const oneOff = useStaffOneOffUnavailability();
  const constraints = React.useMemo(
    () => buildApprovedAvailabilityConstraints(recurring.requests, oneOff.requests),
    [oneOff.requests, recurring.requests],
  );
  return React.useMemo(() => {
    if (!input.shift) return [];
    const isOpen = input.shift.staffId === null;
    const isConflict = input.shift.status === "conflict";
    if (!isOpen && !isConflict) return [];
    return buildRotaRecoveryOptions({
      shift: input.shift,
      staff: input.staff,
      shifts: input.shifts,
      leaveRequests: input.leaveRequests,
      dayIsoDates: input.dayIsoDates,
      excludeStaffId: input.shift.staffId,
      availabilityConstraints: constraints,
    });
  }, [constraints, input.dayIsoDates, input.leaveRequests, input.shift, input.shifts, input.staff]);
}
