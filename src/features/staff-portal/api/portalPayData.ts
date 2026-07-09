import { getSupabaseBrowserClient } from "@/lib/supabase/browserClient";

/**
 * The signed-in staff member's own hourly rate. RLS on `staff_pay_rates`
 * limits staff to their own row (`staff_pay_rates_self_select`); colleague
 * rates and workspace labour settings are manager-only and unreachable here.
 */
export async function fetchPortalOwnPayRate(
  workspaceId: string,
  staffMemberId: string,
): Promise<number | null> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("staff_pay_rates")
    .select("hourly_rate_pence")
    .eq("workspace_id", workspaceId)
    .eq("staff_member_id", staffMemberId)
    .maybeSingle();

  if (error) throw error;
  return (data as { hourly_rate_pence: number } | null)?.hourly_rate_pence ?? null;
}
