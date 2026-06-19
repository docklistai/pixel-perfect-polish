import { createServerFn } from "@tanstack/react-start";
import { describeStaffWriteError } from "../lib/addStaff";
import { updateStaffSchema } from "../lib/editStaff";
import type { UpdateStaffMemberResult } from "../types";

/**
 * Manager-side live staff update. Runs as a server function bound to the
 * caller's session cookie. The active manager workspace is resolved server-side
 * and used to scope the update — `workspace_id` is never trusted from the client
 * (the schema does not accept it). The write goes through the caller's session,
 * so the `staff_members` manager RLS policy is the authority; this adds no
 * schema, RLS, or RPC surface. It updates only lightweight scheduling identity
 * fields: `membership_id` is never touched and no portal access is created or
 * revoked.
 */
export const updateStaffMemberFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => updateStaffSchema.parse(input))
  .handler(async ({ data }): Promise<UpdateStaffMemberResult> => {
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

    // Defensive re-normalisation; the client already trims/lowercases. The update
    // is scoped to both id AND the resolved workspace, and RLS is the backstop.
    const { data: updated, error } = await supabase
      .from("staff_members")
      .update({
        display_name: data.display_name.trim(),
        email: data.email ? data.email.trim().toLowerCase() : null,
        phone: data.phone ? data.phone.trim() : null,
        role_name: data.role_name.trim(),
        department_id: data.department_id,
        contract_type: data.contract_type,
        contracted_minutes_per_week: data.contracted_minutes_per_week,
        employment_status: data.employment_status,
      })
      .eq("id", data.id)
      .eq("workspace_id", workspaceId)
      .select("id")
      .single();

    if (error || !updated) {
      return { ok: false, message: describeStaffWriteError(error?.code ?? null) };
    }
    return { ok: true, id: (updated as { id: string }).id };
  });
