import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Manager-side manual time entry creation. One atomic database transaction
 * (`rpc_create_manual_time_entry`): the entry and its audit-trail `created`
 * event are written together or not at all, with clock bounds and break
 * validated in the database. The workspace is resolved server-side from the
 * session (never trusted from the client) and the row starts `pending` so it
 * flows through the normal review → approve → export path.
 */

const createInput = z.object({
  staffMemberId: z.string().uuid(),
  workDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  clockedInAt: z.string().datetime(),
  clockedOutAt: z.string().datetime(),
  breakMinutes: z.number().int().min(0).max(1440),
  reason: z.string().trim().min(1).max(2000),
});

export type CreateTimeEntryResult = { ok: true; id: string } | { ok: false; message: string };

function describeCreateError(code: string | null | undefined, message?: string | null): string {
  switch (code) {
    case "42501":
      return "You don't have manager access for this action.";
    case "P0002":
      return "That staff member isn't part of this workspace.";
    case "22023":
    case "23514":
    case "55000":
      return message?.includes("break")
        ? "The break cannot be longer than the time worked."
        : "Check the times and try again.";
    default:
      return "We couldn't record the entry. Please try again.";
  }
}

/** Create a pending manual time entry plus its audit-trail `created` event, atomically. */
export const createTimeEntryFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => createInput.parse(input))
  .handler(async ({ data }): Promise<CreateTimeEntryResult> => {
    const { getSupabaseServerClient } = await import("@/lib/supabase/serverClient");
    const { requireActiveManagerWorkspaceId } =
      await import("@/features/auth/api/activeManagerWorkspace");
    const supabase = getSupabaseServerClient();

    let workspaceId: string;
    try {
      workspaceId = await requireActiveManagerWorkspaceId(supabase);
    } catch {
      return { ok: false, message: describeCreateError("42501") };
    }

    if (new Date(data.clockedOutAt) <= new Date(data.clockedInAt)) {
      return { ok: false, message: "Clock-out must be after clock-in." };
    }

    const { data: result, error } = await supabase.rpc("rpc_create_manual_time_entry", {
      p_workspace_id: workspaceId,
      p_staff_member_id: data.staffMemberId,
      p_work_date: data.workDate,
      p_clocked_in_at: data.clockedInAt,
      p_clocked_out_at: data.clockedOutAt,
      p_break_minutes: data.breakMinutes,
      p_reason: data.reason,
    });

    if (error) {
      return { ok: false, message: describeCreateError(error.code ?? null, error.message) };
    }

    const entryId = (result as { time_entry_id: string } | null)?.time_entry_id;
    if (!entryId) {
      return { ok: false, message: describeCreateError(null) };
    }
    return { ok: true, id: entryId };
  });
