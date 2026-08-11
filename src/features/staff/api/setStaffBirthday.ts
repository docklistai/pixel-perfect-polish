import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type SetBirthdayResult = { ok: true } | { ok: false; message: string };

const schema = z.object({
  staffMemberId: z.string().uuid(),
  // Day + month only. There is deliberately no year field in this contract.
  birthDay: z.number().int().min(1).max(31).nullable(),
  birthMonth: z.number().int().min(1).max(12).nullable(),
});

function describeError(sqlState: string | null): string {
  switch (sqlState) {
    case "42501":
      return "You don't have manager access to edit this staff member.";
    case "22023":
      return "Enter both a day and a month, or leave both empty.";
    case "55000":
      return "That staff member could not be found.";
    default:
      return "The birthday didn't save. Try again.";
  }
}

/**
 * Writes the day/month birthday through `rpc_team_set_staff_birthday` — the
 * Phase 55 manager-only, audited RPC. The Phase 45 `rpc_update_staff_member`
 * has no birthday parameters, and widening it would broaden an authority that
 * already has its own tests; this uses the purpose-built path instead.
 */
export const setStaffBirthdayFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => schema.parse(input))
  .handler(async ({ data }): Promise<SetBirthdayResult> => {
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

    const { error } = await supabase.rpc("rpc_team_set_staff_birthday", {
      p_workspace_id: workspaceId,
      p_request_id: crypto.randomUUID(),
      p_staff_member_id: data.staffMemberId,
      p_birth_day: data.birthDay,
      p_birth_month: data.birthMonth,
    });

    if (error) return { ok: false, message: describeError(error.code ?? null) };
    return { ok: true };
  });
