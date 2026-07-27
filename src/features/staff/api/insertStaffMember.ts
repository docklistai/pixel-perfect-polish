import type { SupabaseClient } from "@supabase/supabase-js";
import { describeStaffWriteError, type StaffMemberInsert } from "../lib/addStaff";

export type InsertStaffMemberOutcome = { ok: true; id: string } | { ok: false; message: string };

/** Strict shape of the RPC result; anything else is treated as a failed create. */
function readCreatedStaffMemberId(result: unknown): string | null {
  if (typeof result !== "object" || result === null) return null;
  const id = (result as { staff_member_id?: unknown }).staff_member_id;
  return typeof id === "string" && id.length > 0 ? id : null;
}

/**
 * Shared manager-side staff insert used by both the single Add Staff flow and
 * the bulk paste-list import.
 *
 * A staff member is two linked rows: an *unclaimed* staff membership
 * (`role = 'staff'`, `status = 'invited'`, `user_id = null`) that a personal
 * portal code binds to, and the `staff_members` identity that references it.
 * These were previously two client-driven writes with a best-effort
 * compensating delete when the second failed — and compensation is not a
 * transaction, so a dropped connection left an orphaned invited membership
 * behind after the manager was told the staff member had not been added.
 *
 * `rpc_create_staff_member` (phase 45) now writes both rows in one transaction
 * under the same manager authority guard every other manager RPC uses, so a
 * failed create rolls back completely. Duplicate-email (23505) and department
 * (23503) failures keep their existing codes, so the `describeStaffWriteError`
 * mapping and both add flows behave exactly as before.
 */
export async function insertStaffMember(
  supabase: SupabaseClient,
  workspaceId: string,
  payload: StaffMemberInsert,
): Promise<InsertStaffMemberOutcome> {
  const { data, error } = await supabase.rpc("rpc_create_staff_member", {
    p_workspace_id: workspaceId,
    p_display_name: payload.display_name.trim(),
    p_email: payload.email ? payload.email.trim().toLowerCase() : null,
    p_role_name: payload.role_name.trim(),
    p_department_id: payload.department_id,
    p_contract_type: payload.contract_type,
    p_contracted_minutes_per_week: payload.contracted_minutes_per_week,
  });

  if (error) return { ok: false, message: describeStaffWriteError(error.code ?? null) };

  // A resolved-but-malformed payload is not a successful create. Reporting one
  // as success would leave the roster claiming a member that may not exist.
  const staffMemberId = readCreatedStaffMemberId(data);
  if (!staffMemberId) return { ok: false, message: describeStaffWriteError(null) };

  return { ok: true, id: staffMemberId };
}
