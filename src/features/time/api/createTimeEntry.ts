import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Manager-side manual time entry creation. Inserts through the caller's
 * session, so the existing manager RLS policies (`time_entries_manager_insert`,
 * `time_entry_events_manager_insert`) remain the authority — this adds no
 * schema, RLS, or RPC surface. The workspace is resolved server-side from the
 * session (never trusted from the client), the row starts `pending` so it flows
 * through the normal review → approve → export path, and a `created` event is
 * written to the entry's audit trail. No service-role key, no browser writes.
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

function describeCreateError(code: string | null | undefined): string {
  switch (code) {
    case "42501":
      return "You don't have manager access for this action.";
    case "23503":
      return "That staff member isn't part of this workspace.";
    case "23514":
    case "22023":
    case "55000":
      return "Check the times and try again.";
    default:
      return "We couldn't record the entry. Please try again.";
  }
}

/** Create a pending manual time entry plus its audit-trail `created` event. */
export const createTimeEntryFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => createInput.parse(input))
  .handler(async ({ data }): Promise<CreateTimeEntryResult> => {
    const { getSupabaseServerClient } = await import("@/lib/supabase/serverClient");
    const { requireActiveManagerWorkspaceId } =
      await import("@/features/auth/api/activeManagerWorkspace");
    const supabase = getSupabaseServerClient();
    const workspaceId = await requireActiveManagerWorkspaceId(supabase);

    if (new Date(data.clockedOutAt) <= new Date(data.clockedInAt)) {
      return { ok: false, message: "Clock-out must be after clock-in." };
    }

    const { data: entry, error } = await supabase
      .from("time_entries")
      .insert({
        workspace_id: workspaceId,
        staff_member_id: data.staffMemberId,
        work_date: data.workDate,
        clocked_in_at: data.clockedInAt,
        clocked_out_at: data.clockedOutAt,
        break_minutes: data.breakMinutes,
        approval_status: "pending",
      })
      .select("id")
      .single();

    if (error || !entry) {
      return { ok: false, message: describeCreateError(error?.code ?? null) };
    }
    const entryId = (entry as { id: string }).id;

    // Audit-trail event. The entry itself is the operative record, so a failed
    // event write must not fail the create — the row is already reviewable.
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: membership } = await supabase
        .from("workspace_memberships")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();
      if (membership) {
        await supabase.from("time_entry_events").insert({
          workspace_id: workspaceId,
          time_entry_id: entryId,
          actor_membership_id: (membership as { id: string }).id,
          event_type: "created",
          resulting_approval_status: "pending",
          reason: data.reason,
        });
      }
    }

    return { ok: true, id: entryId };
  });
