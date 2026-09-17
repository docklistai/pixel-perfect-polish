import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type SetEligibleRolesResult = { ok: true; count: number } | { ok: false; message: string };

const schema = z.object({
  staffMemberId: z.string().uuid(),
  roles: z.array(z.string().min(1).max(120)),
});

function describeError(sqlState: string | null): string {
  switch (sqlState) {
    case "42501":
      return "You don't have manager access to update roles for this staff member.";
    case "P0002":
      return "That staff member could not be found.";
    default:
      return "Secondary eligible roles could not be saved. Try again.";
  }
}

/**
 * Saves additive secondary eligible roles for a staff member via `rpc_set_staff_eligible_roles`.
 * Automatically deduplicates and skips the member's primary role on staff_members.
 */
export const setStaffEligibleRolesFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => schema.parse(input))
  .handler(async ({ data }): Promise<SetEligibleRolesResult> => {
    const { getSupabaseServerClient } = await import("@/lib/supabase/serverClient");
    const { requireActiveManagerWorkspaceId } =
      await import("@/features/auth/api/activeManagerWorkspace");
    const supabase = getSupabaseServerClient();

    let workspaceId: string;
    try {
      workspaceId = await requireActiveManagerWorkspaceId(supabase);
    } catch {
      return { ok: false, message: describeError("42501") };
    }

    const { data: result, error } = await supabase.rpc("rpc_set_staff_eligible_roles", {
      p_workspace_id: workspaceId,
      p_staff_member_id: data.staffMemberId,
      p_roles: data.roles,
    });

    if (error) {
      return { ok: false, message: describeError(error.code ?? null) };
    }

    const count =
      typeof result === "object" && result !== null && "eligible_roles_count" in result
        ? Number((result as { eligible_roles_count: number }).eligible_roles_count)
        : 0;

    return { ok: true, count };
  });
