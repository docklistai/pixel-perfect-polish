import type { SupabaseClient } from "@supabase/supabase-js";
import { describeStaffWriteError, type StaffMemberInsert } from "../lib/addStaff";

export type InsertStaffMemberOutcome = { ok: true; id: string } | { ok: false; message: string };

/**
 * Shared manager-side staff insert used by both the single Add Staff flow and
 * the bulk paste-list import. Runs through the caller's session, so the
 * existing manager RLS policies (`workspace_memberships_manager_all`,
 * `staff_members_manager_all`) remain the authority — this adds no schema, RLS,
 * or RPC surface.
 *
 * A new staff member is seeded with an *unclaimed* staff membership
 * (`role = 'staff'`, `status = 'invited'`, `user_id = null`) and linked via
 * `staff_members.membership_id`, so a manager can issue a personal portal code
 * immediately. On a failed staff insert the just-seeded membership is deleted
 * to avoid orphaning an unclaimed membership.
 */
export async function insertStaffMember(
  supabase: SupabaseClient,
  workspaceId: string,
  payload: StaffMemberInsert,
): Promise<InsertStaffMemberOutcome> {
  // 1. Seed the unclaimed staff membership the personal portal code binds to.
  const { data: membership, error: membershipError } = await supabase
    .from("workspace_memberships")
    .insert({
      workspace_id: workspaceId,
      role: "staff",
      status: "invited",
      invited_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (membershipError || !membership) {
    return { ok: false, message: describeStaffWriteError(membershipError?.code ?? null) };
  }
  const membershipId = (membership as { id: string }).id;

  // 2. Create the staff identity linked to that membership. Defensive
  //    re-normalisation; employment_status defaults to 'active'.
  const { data: inserted, error } = await supabase
    .from("staff_members")
    .insert({
      workspace_id: workspaceId,
      membership_id: membershipId,
      display_name: payload.display_name.trim(),
      email: payload.email ? payload.email.trim().toLowerCase() : null,
      role_name: payload.role_name.trim(),
      department_id: payload.department_id,
      contract_type: payload.contract_type,
      contracted_minutes_per_week: payload.contracted_minutes_per_week,
      employment_status: "active",
    })
    .select("id")
    .single();

  if (error || !inserted) {
    // Compensate: the staff insert failed (e.g. duplicate workspace email), so
    // the seeded membership would otherwise dangle. Best-effort cleanup.
    await supabase
      .from("workspace_memberships")
      .delete()
      .eq("id", membershipId)
      .eq("workspace_id", workspaceId);
    return { ok: false, message: describeStaffWriteError(error?.code ?? null) };
  }
  return { ok: true, id: (inserted as { id: string }).id };
}
