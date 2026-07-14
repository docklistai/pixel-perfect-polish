import * as React from "react";
import { useStaffOneOffUnavailability } from "@/features/staff/hooks/useStaffOneOffUnavailability";
import { useStaffRecurringDaysOff } from "@/features/staff/hooks/useStaffRecurringDaysOff";
import {
  applyAvailabilityHints,
  buildApprovedAvailabilityConstraints,
  findAvailabilityConstraintClashes,
  type AvailabilityConstraintClash,
  type ApprovedAvailabilityConstraints,
} from "../lib/availabilityConstraints";
import type { DraftShift, RotaGridStaffRow, StaffMember } from "../types";

export interface RotaAvailabilityConstraints {
  constraints: ApprovedAvailabilityConstraints;
  clashes: AvailabilityConstraintClash[];
  staffRows: RotaGridStaffRow[];
  dataState: "ready" | "loading" | "error";
}

export function useAvailabilityConstraints(input: {
  source: "live" | "demo";
  draftShifts: DraftShift[];
  dayIsoDates: string[];
  staff: StaffMember[];
  staffRows: RotaGridStaffRow[];
}): RotaAvailabilityConstraints {
  const recurring = useStaffRecurringDaysOff();
  const oneOff = useStaffOneOffUnavailability();
  const constraints = React.useMemo(
    () => buildApprovedAvailabilityConstraints(recurring.requests, oneOff.requests),
    [oneOff.requests, recurring.requests],
  );
  const staffById = React.useMemo(
    () => new Map(input.staff.map((member) => [member.id, member])),
    [input.staff],
  );
  const clashes = React.useMemo(
    () =>
      input.source === "live"
        ? findAvailabilityConstraintClashes(
            input.draftShifts,
            input.dayIsoDates,
            constraints,
            staffById,
          )
        : [],
    [constraints, input.dayIsoDates, input.draftShifts, input.source, staffById],
  );
  const staffRows = React.useMemo(
    () =>
      input.source === "live"
        ? applyAvailabilityHints(input.staffRows, input.dayIsoDates, constraints)
        : input.staffRows,
    [constraints, input.dayIsoDates, input.source, input.staffRows],
  );
  const dataState =
    input.source !== "live"
      ? "ready"
      : recurring.isError || oneOff.isError
        ? "error"
        : recurring.isLoading || oneOff.isLoading
          ? "loading"
          : "ready";
  return { constraints, clashes, staffRows, dataState };
}
