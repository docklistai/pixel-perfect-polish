import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";

export const dashboardAttentionCountsInput = z.object({
  workspaceId: z.string().uuid(),
});

export interface DashboardAttentionCounts {
  openShiftRequestCount: number;
  shiftReleaseRequestCount: number;
  unavailabilityRequestCount: number;
  recurringDayOffRequestCount: number;
  timeQueryCount: number;
}

/**
 * Head-only counts for pending manager-actionable staff operational requests:
 * open-shift requests, shift-release requests, availability/day-off requests,
 * and hours queries.
 */
export const fetchDashboardAttentionCountsFn = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => dashboardAttentionCountsInput.parse(input))
  .handler(async ({ data }): Promise<DashboardAttentionCounts> => {
    const supabase = getSupabaseServerClient();
    const [openShifts, shiftReleases, unavailabilities, recurringDaysOff, timeHoursQueries] =
      await Promise.all([
        supabase
          .from("open_shift_requests")
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", data.workspaceId)
          .eq("status", "pending"),
        supabase
          .from("shift_release_requests")
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", data.workspaceId)
          .eq("status", "pending"),
        supabase
          .from("staff_one_off_unavailability_requests")
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", data.workspaceId)
          .eq("status", "pending"),
        supabase
          .from("staff_recurring_day_off_requests")
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", data.workspaceId)
          .eq("status", "pending"),
        supabase
          .from("time_hours_queries")
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", data.workspaceId)
          .eq("status", "pending"),
      ]);

    if (openShifts.error) throw openShifts.error;
    if (shiftReleases.error) throw shiftReleases.error;
    if (unavailabilities.error) throw unavailabilities.error;
    if (recurringDaysOff.error) throw recurringDaysOff.error;
    if (timeHoursQueries.error) throw timeHoursQueries.error;

    return {
      openShiftRequestCount: openShifts.count ?? 0,
      shiftReleaseRequestCount: shiftReleases.count ?? 0,
      unavailabilityRequestCount: unavailabilities.count ?? 0,
      recurringDayOffRequestCount: recurringDaysOff.count ?? 0,
      timeQueryCount: timeHoursQueries.count ?? 0,
    };
  });
