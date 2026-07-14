import * as React from "react";
import { usePortalLeaveRequests } from "./usePortalLeaveRequests";
import { usePortalOneOffUnavailability } from "./usePortalOneOffUnavailability";
import { usePortalRecurringDaysOff } from "./usePortalRecurringDaysOff";
import type { PortalOpenShiftConstraints } from "../lib/openShiftEligibility";

export interface PortalOpenShiftConstraintState {
  isLoading: boolean;
  isError: boolean;
  constraints: PortalOpenShiftConstraints;
}

export function usePortalOpenShiftConstraints(): PortalOpenShiftConstraintState {
  const leave = usePortalLeaveRequests();
  const recurring = usePortalRecurringDaysOff();
  const oneOff = usePortalOneOffUnavailability();
  const constraints = React.useMemo(
    () => ({
      approvedLeave: leave.approvedLeave.map((request) => ({
        startIso: request.startIso,
        endIso: request.endIso,
      })),
      approvedRecurringWeekdays: new Set(
        recurring.requests
          .filter((request) => request.status === "approved")
          .map((request) => request.weekday),
      ),
      approvedUnavailableDates: new Set(
        oneOff.requests
          .filter((request) => request.status === "approved")
          .map((request) => request.date),
      ),
    }),
    [leave.approvedLeave, oneOff.requests, recurring.requests],
  );
  return {
    isLoading: leave.isLoading || recurring.isLoading || oneOff.isLoading,
    isError: leave.isError || recurring.isError || oneOff.isError,
    constraints,
  };
}
