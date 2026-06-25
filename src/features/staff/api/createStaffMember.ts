import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { describeStaffWriteError } from "../lib/addStaff";
import type { CreateStaffMemberResult } from "../types";

/**
 * Manager-side live staff create. Runs as a server function bound to the
 * caller's session cookie. The active manager workspace is resolved server-side
 * and stamped onto the insert — `workspace_id` is never trusted from the client.
 * Both writes go through the caller's session, so the existing manager RLS
 * policies (`workspace_memberships_manager_all`, `staff_members_manager_all`)
 * remain the authority; this adds no schema, RLS, or RPC surface.
 *
 * A new staff member is seeded with an *unclaimed* staff membership
 * (`role = 'staff'`, `status = 'invited'`, `user_id = null`) and the
 * `staff_members.membership_id` is linked to it, so a manager can issue a
 * personal portal code immediately — no manual SQL. The membership stays a
 * bearer-code target only; no account is bound, no code is issued, and no
 * owner/manager role is ever granted from this flow. PostgREST runs the two
 * inserts as separate statements, so on a failed staff insert the just-seeded
 * membership is deleted to avoid orphaning an unclaimed staff membership.
 */

const createStaffSchema = z.object({
  display_name: z.string().min(1).max(160),
  email: z.string().email().max(320).nullable(),
  role_name: z.string().min(1).max(120),
  department_id: z.string().uuid().nullable(),
  contract_type: z.enum(["full_time", "part_time", "casual", "fixed_term"]).nullable(),
  contracted_minutes_per_week: z.number().int().min(0).max(10080).nullable(),
});

export const createStaffMemberFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => createStaffSchema.parse(input))
  .handler(async ({ data }): Promise<CreateStaffMemberResult> => {
    const { getSupabaseServerClient } = await import("@/lib/supabase/serverClient");
    const { requireActiveManagerWorkspaceId } =
      await import("@/features/auth/api/activeManagerWorkspace");
    const supabase = getSupabaseServerClient();

    let workspaceId: string;
    try {
      workspaceId = await requireActiveManagerWorkspaceId(supabase);
    } catch {
      return { ok: false, message: describeStaffWriteError("42501") };
    }

    // 1. Seed the unclaimed staff membership the personal portal code binds to.
    //    The guard trigger only blocks non-owner *owner*-role inserts, so this
    //    'staff' insert is permitted; status/user_id keep it an unclaimed
    //    bearer-code target (never an active account).
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
    //    re-normalisation; the client already trims/lowercases, but the server
    //    must not rely on that. employment_status defaults to 'active'.
    const { data: inserted, error } = await supabase
      .from("staff_members")
      .insert({
        workspace_id: workspaceId,
        membership_id: membershipId,
        display_name: data.display_name.trim(),
        email: data.email ? data.email.trim().toLowerCase() : null,
        role_name: data.role_name.trim(),
        department_id: data.department_id,
        contract_type: data.contract_type,
        contracted_minutes_per_week: data.contracted_minutes_per_week,
        employment_status: "active",
      })
      .select("id")
      .single();

    if (error || !inserted) {
      // Compensate: the staff insert failed (e.g. duplicate workspace email),
      // so the seeded membership would otherwise dangle. Best-effort cleanup,
      // scoped to id + workspace; the failure surfaced to the manager is the
      // staff insert's, which is the actionable one.
      await supabase
        .from("workspace_memberships")
        .delete()
        .eq("id", membershipId)
        .eq("workspace_id", workspaceId);
      return { ok: false, message: describeStaffWriteError(error?.code ?? null) };
    }
    return { ok: true, id: (inserted as { id: string }).id };
  });
