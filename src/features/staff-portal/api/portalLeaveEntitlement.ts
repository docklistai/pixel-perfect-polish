import { getSupabaseBrowserClient } from "@/lib/supabase/browserClient";
import type { BalanceLeaveRequest } from "@/features/leave/lib/leaveBalance";

/**
 * Browser-side staff-safe entitlement reads.
 *
 * Both reads hit `staff_portal_*` security-barrier views, never base tables, so
 * a staff member can only ever see their own rows. Nothing here writes: only a
 * manager records entitlement, and there is no staff insert/update/delete
 * policy on the underlying table at all.
 *
 * The entitlement row carries its own `leave_year_start`, which is what lets
 * the portal resolve its leave-year window without any read path into
 * manager-only `workspace_settings`.
 */

export interface PortalEntitlementRow {
  leaveYearStart: string;
  entitlementDays: number;
}

interface EntitlementViewRow {
  leave_year_start: string;
  entitlement_days: number;
}

interface LeaveRequestWindowRow {
  leave_type: string;
  start_date: string;
  end_date: string;
  status: string;
}

/** Every leave year the signed-in staff member has a recorded entitlement for. */
export async function fetchPortalEntitlements(
  workspaceId: string,
  staffMemberId: string,
): Promise<PortalEntitlementRow[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("staff_portal_leave_entitlements")
    .select("leave_year_start, entitlement_days")
    .eq("workspace_id", workspaceId)
    .eq("staff_member_id", staffMemberId)
    .order("leave_year_start", { ascending: false });

  if (error) throw error;
  return ((data as EntitlementViewRow[] | null) ?? []).map((row) => ({
    leaveYearStart: row.leave_year_start,
    entitlementDays: row.entitlement_days,
  }));
}

/**
 * The staff member's own annual leave overlapping one leave year.
 *
 * Bounded by the leave-year window rather than the rolling operational range,
 * because a balance must see the whole year even where it falls outside the
 * inbox window the rest of the portal uses.
 */
export async function fetchPortalAnnualLeaveInWindow(
  workspaceId: string,
  staffMemberId: string,
  startIso: string,
  endIso: string,
): Promise<BalanceLeaveRequest[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("staff_portal_leave_requests")
    .select("leave_type, start_date, end_date, status")
    .eq("workspace_id", workspaceId)
    .eq("staff_member_id", staffMemberId)
    .eq("leave_type", "annual_leave")
    .in("status", ["approved", "pending"])
    .lte("start_date", endIso)
    .gte("end_date", startIso);

  if (error) throw error;
  return ((data as LeaveRequestWindowRow[] | null) ?? []).map((row) => ({
    startIso: row.start_date,
    endIso: row.end_date,
    leaveType: row.leave_type,
    status: row.status,
  }));
}
