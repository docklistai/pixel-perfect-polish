import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const cancelInput = z.object({
  workspaceId: z.string().uuid(),
  leaveRequestId: z.string().uuid(),
});

export type CancelPortalLeaveResult = { ok: true } | { ok: false; message: string };

/** Withdraws only the signed-in staff member's own pending leave request. */
export const cancelPortalLeaveRequestFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => cancelInput.parse(input))
  .handler(async ({ data }): Promise<CancelPortalLeaveResult> => {
    const { getSupabaseServerClient } = await import("@/lib/supabase/serverClient");
    const supabase = getSupabaseServerClient();
    const { error } = await supabase.rpc("rpc_cancel_leave_request", {
      p_workspace_id: data.workspaceId,
      p_leave_request_id: data.leaveRequestId,
    });
    if (!error) return { ok: true };
    const message =
      error.code === "42501"
        ? "You can only withdraw your own leave request."
        : error.code === "55000"
          ? "Only a pending leave request can be withdrawn."
          : error.code === "P0002"
            ? "That leave request is no longer available."
            : "We couldn't withdraw your request. Please try again.";
    return { ok: false, message };
  });
