import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Manager-side staff hourly rates (staff_pay_rates). One current rate per
 * staff member, in pence. Powers rota labour cost estimates and the staff
 * member's own portal pay estimate. This is planning data — payroll stays
 * disabled.
 */

export type StaffPayRatesResult = {
  /** staff_member_id → hourly rate in pence. */
  rates: Record<string, number>;
};

export const fetchStaffPayRatesFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<StaffPayRatesResult> => {
    const { getSupabaseServerClient } = await import("@/lib/supabase/serverClient");
    const { requireActiveManagerWorkspaceId } = await import(
      "@/features/auth/api/activeManagerWorkspace"
    );
    const supabase = getSupabaseServerClient();
    const workspaceId = await requireActiveManagerWorkspaceId(supabase);

    const { data, error } = await supabase
      .from("staff_pay_rates")
      .select("staff_member_id, hourly_rate_pence")
      .eq("workspace_id", workspaceId);
    if (error) throw error;

    const rates: Record<string, number> = {};
    for (const row of (data ?? []) as { staff_member_id: string; hourly_rate_pence: number }[]) {
      rates[row.staff_member_id] = row.hourly_rate_pence;
    }
    return { rates };
  },
);

const savePayRateInput = z.object({
  staffMemberId: z.string().uuid(),
  /** Null clears the recorded rate so the workspace fallback applies again. */
  hourlyRatePence: z.number().int().min(0).max(100_000).nullable(),
});

export type SaveStaffPayRateInput = z.infer<typeof savePayRateInput>;

export const saveStaffPayRateFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => savePayRateInput.parse(input))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { getSupabaseServerClient } = await import("@/lib/supabase/serverClient");
    const { requireActiveManagerWorkspaceId } = await import(
      "@/features/auth/api/activeManagerWorkspace"
    );
    const supabase = getSupabaseServerClient();
    const workspaceId = await requireActiveManagerWorkspaceId(supabase);

    if (data.hourlyRatePence === null) {
      const { error } = await supabase
        .from("staff_pay_rates")
        .delete()
        .eq("workspace_id", workspaceId)
        .eq("staff_member_id", data.staffMemberId);
      if (error) throw error;
      return { ok: true };
    }

    const { error } = await supabase.from("staff_pay_rates").upsert(
      {
        workspace_id: workspaceId,
        staff_member_id: data.staffMemberId,
        hourly_rate_pence: data.hourlyRatePence,
      },
      { onConflict: "workspace_id,staff_member_id" },
    );
    if (error) throw error;
    return { ok: true };
  });
