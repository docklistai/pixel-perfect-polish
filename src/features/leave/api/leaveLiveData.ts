import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { toSafeBusinessMessage } from "@/lib/safe-errors";

export {
  fetchLeaveOperationalCountsFn,
  fetchPendingLeaveCountFn,
  fetchPendingLeavePreviewFn,
  fetchRotaLeaveFn,
  fetchStaffLeaveFn,
  fetchWorkspaceLeaveFn,
  type LeaveOperationalCounts,
  type PendingLeavePreview,
} from "./leaveOperationalReads";

const decideInput = z
  .object({
    workspaceId: z.string().uuid(),
    leaveRequestId: z.string().uuid(),
    status: z.enum(["approved", "declined", "pending", "cancelled"]),
    reason: z.string().trim().max(2000).optional(),
  })
  .superRefine((input, context) => {
    if (input.status === "cancelled" && !input.reason) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["reason"],
        message: "A cancellation reason is required.",
      });
    }
  });

export type DecideLeaveResult = { ok: true } | { ok: false; message: string };

/**
 * Approves, declines, reopens, or manager-cancels leave through the
 * SECURITY DEFINER state machine. The RPC owns locking, immutable events,
 * audit evidence, targeted notifications, and any rota-update issue.
 */
export const decideLeaveRequestFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => decideInput.parse(input))
  .handler(async ({ data }): Promise<DecideLeaveResult> => {
    const { getSupabaseServerClient } = await import("@/lib/supabase/serverClient");
    const supabase = getSupabaseServerClient();
    const { error } = await supabase.rpc("rpc_decide_leave_request", {
      p_workspace_id: data.workspaceId,
      p_leave_request_id: data.leaveRequestId,
      p_status: data.status,
      p_reason: data.reason ?? null,
    });

    if (!error) return { ok: true };
    const message =
      error.code === "42501"
        ? "You don't have manager access to decide this request."
        : toSafeBusinessMessage(error, "We couldn't update the request. Please try again.");
    return { ok: false, message };
  });
