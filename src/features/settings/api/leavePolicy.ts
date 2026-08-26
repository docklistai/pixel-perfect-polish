import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Workspace leave policy (workspace_settings).
 *
 * Two manager-stated facts: the month the leave year begins, and the default
 * annual leave in CALENDAR days. Both are nullable and neither has a database
 * default, so a workspace that has never configured leave stays honestly
 * unconfigured instead of acquiring a statutory-looking figure.
 *
 * The default is a stated policy and a pre-fill for recording an individual's
 * entitlement. It is never a read-time fallback: a staff member with no
 * `staff_leave_entitlements` row reads as "not recorded" everywhere, so the
 * manager view and the staff portal can never disagree.
 *
 * Reads and writes are server functions bound to the caller's session; the
 * active manager workspace is resolved server-side and RLS backs up tenancy.
 */

export type WorkspaceLeavePolicy = {
  /** 1-12, or null when the workspace has not configured a leave year. */
  leaveYearStartMonth: number | null;
  /** Calendar days, or null when no default has been stated. */
  defaultAnnualLeaveDays: number | null;
};

export type WorkspaceLeavePolicyResult = {
  policy: WorkspaceLeavePolicy;
};

interface PolicyRow {
  leave_year_start_month: number | null;
  default_annual_leave_days: number | null;
}

const POLICY_COLUMNS = "leave_year_start_month, default_annual_leave_days";

const UNCONFIGURED: WorkspaceLeavePolicy = {
  leaveYearStartMonth: null,
  defaultAnnualLeaveDays: null,
};

function mapPolicy(row: PolicyRow): WorkspaceLeavePolicy {
  return {
    leaveYearStartMonth: row.leave_year_start_month,
    defaultAnnualLeaveDays: row.default_annual_leave_days,
  };
}

export const fetchLeavePolicyFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<WorkspaceLeavePolicyResult> => {
    const { getSupabaseServerClient } = await import("@/lib/supabase/serverClient");
    const { requireActiveManagerWorkspaceId } =
      await import("@/features/auth/api/activeManagerWorkspace");
    const supabase = getSupabaseServerClient();
    const workspaceId = await requireActiveManagerWorkspaceId(supabase);

    const { data, error } = await supabase
      .from("workspace_settings")
      .select(POLICY_COLUMNS)
      .eq("workspace_id", workspaceId)
      .maybeSingle();
    if (error) throw error;

    // No settings row at all is the same answer as a row with both columns
    // null: the workspace has not configured leave.
    return { policy: data ? mapPolicy(data as PolicyRow) : UNCONFIGURED };
  },
);

const saveLeavePolicyInput = z.object({
  leaveYearStartMonth: z.number().int().min(1).max(12).nullable(),
  defaultAnnualLeaveDays: z.number().int().min(0).max(366).nullable(),
});

export type SaveLeavePolicyInput = z.infer<typeof saveLeavePolicyInput>;

export const saveLeavePolicyFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => saveLeavePolicyInput.parse(input))
  .handler(async ({ data }): Promise<WorkspaceLeavePolicyResult> => {
    const { getSupabaseServerClient } = await import("@/lib/supabase/serverClient");
    const { requireActiveManagerWorkspaceId } =
      await import("@/features/auth/api/activeManagerWorkspace");
    const supabase = getSupabaseServerClient();
    const workspaceId = await requireActiveManagerWorkspaceId(supabase);

    // Only the two leave columns are sent, so the labour-planning settings that
    // share this row are untouched by a leave-policy save.
    const { data: saved, error } = await supabase
      .from("workspace_settings")
      .upsert(
        {
          workspace_id: workspaceId,
          leave_year_start_month: data.leaveYearStartMonth,
          default_annual_leave_days: data.defaultAnnualLeaveDays,
        },
        { onConflict: "workspace_id" },
      )
      .select(POLICY_COLUMNS)
      .single();
    if (error) throw error;

    return { policy: mapPolicy(saved as PolicyRow) };
  });
