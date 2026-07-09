import { useMemo } from "react";
import { useStaffRecurringDaysOff } from "@/features/staff/hooks/useStaffRecurringDaysOff";
import {
  findRecurringDayOffClashes,
  type RecurringDayOffClash,
} from "../lib/recurringDayOffClashes";
import type { DraftShift, StaffMember } from "../types";

/**
 * Rota shifts scheduled on a staff member's *approved* standing day off. Shared
 * by the insights card (to list them) and the route (to fold their count into
 * publish readiness). Only live manager workspaces have recurring data, so demo
 * rotas return an empty list.
 */
export function useRecurringDayOffClashes(input: {
  source: "live" | "demo";
  draftShifts: DraftShift[];
  dayIsoDates: string[];
  staff: StaffMember[];
}): RecurringDayOffClash[] {
  const recurring = useStaffRecurringDaysOff();

  return useMemo(() => {
    if (input.source !== "live" || !recurring.enabled) return [];
    const approvedByStaff = new Map<string, Set<number>>();
    for (const request of recurring.requests) {
      if (request.status !== "approved") continue;
      const set = approvedByStaff.get(request.staffMemberId) ?? new Set<number>();
      set.add(request.weekday);
      approvedByStaff.set(request.staffMemberId, set);
    }
    const staffById = new Map(input.staff.map((member) => [member.id, member]));
    return findRecurringDayOffClashes(
      input.draftShifts,
      input.dayIsoDates,
      approvedByStaff,
      staffById,
    );
  }, [input.source, input.draftShifts, input.dayIsoDates, input.staff, recurring.enabled, recurring.requests]);
}
