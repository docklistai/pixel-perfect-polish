import type { SupabaseClient } from "@supabase/supabase-js";
import type { BalanceLeaveRequest, LeaveBalance } from "../lib/leaveBalance";
import { leaveYearLabel, type LeaveYearWindow } from "../lib/leaveYear";

/**
 * Shared model and query helpers for manager-side leave entitlement.
 *
 * Deliberately separate from `leaveOperationalReads.ts`: that module serves the
 * rolling operational window (-90/+370 days) that drives the request inbox, and
 * that window cannot produce an annual balance. Everything here is bounded by
 * the resolved LEAVE YEAR instead.
 *
 * The unit is the CALENDAR DAY throughout — see `lib/leaveBalance.ts`.
 *
 * Split out of `leaveEntitlements.ts` so that module stays within the service
 * file-size guardrail; the server functions remain the only public entry point.
 */

export interface LeaveYearContext {
  startIso: string;
  endIso: string;
  label: string;
}

export interface StaffLeaveBalance extends LeaveBalance {
  staffMemberId: string;
  displayName: string;
  roleName: string;
}

export interface LeaveBalancesResult {
  /** False when the workspace has no leave-year start month configured. */
  configured: boolean;
  leaveYear: LeaveYearContext | null;
  /** Workspace default in calendar days — pre-fill only, never a fallback. */
  defaultAnnualLeaveDays: number | null;
  balances: StaffLeaveBalance[];
}

export interface StaffLeaveBalanceResult {
  configured: boolean;
  leaveYear: LeaveYearContext | null;
  defaultAnnualLeaveDays: number | null;
  balance: StaffLeaveBalance | null;
}

export const REQUEST_COLUMNS = "staff_member_id, leave_type, start_date, end_date, status";
export const ENTITLEMENT_COLUMNS = "staff_member_id, entitlement_days";
export const STAFF_COLUMNS = "id, display_name, role_name";
export const POLICY_COLUMNS = "leave_year_start_month, default_annual_leave_days";

export interface RequestRow {
  staff_member_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  status: string;
}

export interface StaffRow {
  id: string;
  display_name: string;
  role_name: string;
}

export async function managerContext(expectedWorkspaceId: string) {
  const { getSupabaseServerClient } = await import("@/lib/supabase/serverClient");
  const { requireActiveManagerWorkspaceId } =
    await import("@/features/auth/api/activeManagerWorkspace");
  const supabase = getSupabaseServerClient();
  const workspaceId = await requireActiveManagerWorkspaceId(supabase);
  if (workspaceId !== expectedWorkspaceId) throw new Error("Active workspace changed");
  return { supabase, workspaceId };
}

/** Today in ISO form. Balances are always "as of now" for the caller. */
export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function readPolicy(
  supabase: SupabaseClient,
  workspaceId: string,
): Promise<{ startMonth: number | null; defaultDays: number | null }> {
  const { data, error } = await supabase
    .from("workspace_settings")
    .select(POLICY_COLUMNS)
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (error) throw error;
  const row = data as {
    leave_year_start_month: number | null;
    default_annual_leave_days: number | null;
  } | null;
  return {
    startMonth: row?.leave_year_start_month ?? null,
    defaultDays: row?.default_annual_leave_days ?? null,
  };
}

export function toContext(window: LeaveYearWindow): LeaveYearContext {
  return { startIso: window.startIso, endIso: window.endIso, label: leaveYearLabel(window) };
}

/**
 * Annual-leave requests that could contribute days to the window.
 *
 * Bounded by the leave year on both sides and filtered to the one
 * entitlement-consuming type in the query, so the balance calculation never
 * sees a row it would have to discard.
 */
export async function readLeaveYearRequests(
  supabase: SupabaseClient,
  workspaceId: string,
  window: LeaveYearWindow,
  staffMemberId?: string,
): Promise<RequestRow[]> {
  let query = supabase
    .from("leave_requests")
    .select(REQUEST_COLUMNS)
    .eq("workspace_id", workspaceId)
    .eq("leave_type", "annual_leave")
    .in("status", ["approved", "pending"])
    .lte("start_date", window.endIso)
    .gte("end_date", window.startIso);
  if (staffMemberId) query = query.eq("staff_member_id", staffMemberId);

  const { data, error } = await query;
  if (error) throw error;
  return (data as RequestRow[] | null) ?? [];
}

export function toBalanceRequests(rows: RequestRow[]): BalanceLeaveRequest[] {
  return rows.map((row) => ({
    startIso: row.start_date,
    endIso: row.end_date,
    leaveType: row.leave_type,
    status: row.status,
  }));
}
