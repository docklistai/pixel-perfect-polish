import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Staff-side portal write actions. Every write goes through a SECURITY DEFINER
 * RPC executed by a per-request server client bound to the caller's session
 * cookie — never a direct browser table write, never a service-role key. The
 * RPCs re-derive the caller's identity, role, and workspace from `auth.uid()`,
 * so a staff member can only ever act on their own records.
 */

export type SubmitLeaveResult = { ok: true } | { ok: false; message: string };

const submitLeaveSchema = z.object({
  workspaceId: z.string().uuid(),
  leaveType: z.enum(["annual_leave", "personal", "sick", "unpaid", "other"]),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().trim().min(1).max(2000),
});

function describeSubmitError(sqlState: string | null): string {
  switch (sqlState) {
    case "42501":
      return "You don't have staff access to submit leave for this workspace.";
    case "22023":
      return "Check the leave type, dates, and reason, then try again.";
    default:
      return "We couldn't submit your request. Please try again.";
  }
}

/**
 * Submits a pending leave request for the signed-in staff member via
 * `rpc_submit_leave_request`. The RPC writes the request, its submitted event,
 * the manager fan-out, and an audit record in one transaction.
 */
export const submitLeaveRequestFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => submitLeaveSchema.parse(input))
  .handler(async ({ data }): Promise<SubmitLeaveResult> => {
    const { getSupabaseServerClient } = await import("@/lib/supabase/serverClient");
    const supabase = getSupabaseServerClient();

    const { error } = await supabase.rpc("rpc_submit_leave_request", {
      p_workspace_id: data.workspaceId,
      p_leave_type: data.leaveType,
      p_start_date: data.startDate,
      p_end_date: data.endDate,
      p_reason: data.reason,
    });

    if (error) {
      return { ok: false, message: describeSubmitError(error.code ?? null) };
    }

    return { ok: true };
  });

const markReadSchema = z.object({ workspaceId: z.string().uuid() });

/**
 * Marks all of the signed-in staff member's own notification deliveries read.
 * This is a non-sensitive own-data write: the `notification_deliveries`
 * recipient-update RLS policy restricts the update to the caller's own
 * deliveries, so it can never touch another member's read state.
 */
export const markPortalNotificationsReadFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => markReadSchema.parse(input))
  .handler(async ({ data }): Promise<SubmitLeaveResult> => {
    const { getSupabaseServerClient } = await import("@/lib/supabase/serverClient");
    const supabase = getSupabaseServerClient();

    const { error } = await supabase
      .from("notification_deliveries")
      .update({ read_at: new Date().toISOString() })
      .eq("workspace_id", data.workspaceId)
      .is("read_at", null);

    if (error) {
      return { ok: false, message: "We couldn't update your notifications. Please try again." };
    }

    return { ok: true };
  });
