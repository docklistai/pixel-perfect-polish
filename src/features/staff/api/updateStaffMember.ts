import { createServerFn } from "@tanstack/react-start";
import { describeStaffWriteError } from "../lib/addStaff";
import {
  isOffboardOnlyStatusWrite,
  OFFBOARD_ONLY_STATUS_MESSAGE,
  updateStaffSchema,
} from "../lib/editStaff";
import type { UpdateStaffMemberResult } from "../types";

/** Strict shape of the RPC result; anything else is treated as a failed update. */
function readUpdatedStaffMemberId(result: unknown): string | null {
  if (typeof result !== "object" || result === null) return null;
  const id = (result as { staff_member_id?: unknown }).staff_member_id;
  return typeof id === "string" && id.length > 0 ? id : null;
}

/**
 * Manager-side live staff update. Runs as a server function bound to the
 * caller's session cookie. The active manager workspace is resolved server-side
 * and used to scope the update — `workspace_id` is never trusted from the client
 * (the schema does not accept it).
 *
 * The write goes through `rpc_update_staff_member` (phase 45) rather than a
 * direct table update, because `authenticated` no longer holds `UPDATE` on
 * `public.staff_members`. That is the point: guarding `employment_status` here
 * only ever closed the product route to `left`, while the table itself stayed
 * writable by any manager with a handcrafted PostgREST request. The database now
 * enforces the same rule this function does — `left` is reachable only through
 * `rpc_offboard_staff_member`, which also revokes portal access and writes its
 * own audit event.
 *
 * It updates only lightweight scheduling identity fields: `membership_id` is
 * never touched and no portal access is created or revoked.
 */
export const updateStaffMemberFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    // Explicit and attributable, ahead of schema parsing: a crafted request
    // asking this generic update to write 'left' is refused outright rather
    // than coerced into some other status. Offboarding revokes portal access
    // and writes its own audit event, so `rpc_offboard_staff_member` stays the
    // only route to that state.
    if (isOffboardOnlyStatusWrite(input)) throw new Error(OFFBOARD_ONLY_STATUS_MESSAGE);
    return updateStaffSchema.parse(input);
  })
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

    // Defensive re-normalisation; the RPC normalises again server-side, which is
    // the authority. The update is scoped to both id AND the resolved workspace.
    const { data: updated, error } = await supabase.rpc("rpc_update_staff_member", {
      p_workspace_id: workspaceId,
      p_staff_member_id: data.id,
      p_display_name: data.display_name.trim(),
      p_email: data.email ? data.email.trim().toLowerCase() : null,
      p_phone: data.phone ? data.phone.trim() : null,
      p_role_name: data.role_name.trim(),
      p_department_id: data.department_id,
      p_contract_type: data.contract_type,
      p_contracted_minutes_per_week: data.contracted_minutes_per_week,
      // Null for an offboarded member, whose status this edit must not touch.
      p_employment_status: data.employment_status ?? null,
    });

    if (error) {
      const { toSafeBusinessMessage } = await import("@/lib/safe-errors");
      // 55000/22023 are the RPC's hand-authored, customer-safe refusals (the
      // offboard-only rule, an unavailable department). Everything else falls
      // back to the shared mapping rather than leaking a driver message.
      return {
        ok: false,
        message: toSafeBusinessMessage(error, describeStaffWriteError(error.code ?? null)),
      };
    }

    // A resolved-but-malformed payload is not a successful update.
    const id = readUpdatedStaffMemberId(updated);
    if (!id) return { ok: false, message: describeStaffWriteError(null) };
    return { ok: true, id };
  });
