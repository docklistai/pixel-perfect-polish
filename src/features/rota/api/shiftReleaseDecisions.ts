import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const decisionSchema = z.object({
  requestId: z.string().uuid(),
  note: z.string().trim().max(2000).nullable(),
});

export type ShiftReleaseDecisionInput = z.infer<typeof decisionSchema>;
export type ShiftReleaseDecisionResult = { ok: true } | { ok: false; message: string };

function decisionError(code: string | null, message: string | null): string {
  if (code === "42501") return "You don't have manager access for this action.";
  if (code === "P0002") return "That release request no longer exists.";
  if (code === "22023") return message ?? "Check the decision note, then try again.";
  if (code === "55000") return message ?? "That request can no longer be decided.";
  return "We couldn't save the release decision. Please try again.";
}

async function decide(
  rpc: "rpc_approve_shift_release" | "rpc_decline_shift_release",
  data: ShiftReleaseDecisionInput,
): Promise<ShiftReleaseDecisionResult> {
  const { getSupabaseServerClient } = await import("@/lib/supabase/serverClient");
  const { requireActiveManagerWorkspaceId } =
    await import("@/features/auth/api/activeManagerWorkspace");
  const supabase = getSupabaseServerClient();
  const workspaceId = await requireActiveManagerWorkspaceId(supabase);
  const { error } = await supabase.rpc(rpc, {
    p_workspace_id: workspaceId,
    p_request_id: data.requestId,
    p_note: data.note,
  });
  return error
    ? { ok: false, message: decisionError(error.code ?? null, error.message ?? null) }
    : { ok: true };
}

export const approveShiftReleaseFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => decisionSchema.parse(input))
  .handler(async ({ data }) => decide("rpc_approve_shift_release", data));

export const declineShiftReleaseFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => decisionSchema.parse(input))
  .handler(async ({ data }) => decide("rpc_decline_shift_release", data));
