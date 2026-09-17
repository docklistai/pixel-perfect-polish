import { createServerFn } from "@tanstack/react-start";
import { flagTimeEntryInput, unflagTimeEntryInput, type TimeWriteResult } from "./timeLiveSchemas";

function describeFlagError(code: string | null | undefined): string {
  switch (code) {
    case "42501":
      return "You don't have manager access for this action.";
    case "P0002":
      return "The timesheet entry was not found in this workspace.";
    case "22023":
      return "A note is required when flagging an entry for review.";
    default:
      return "We couldn't update the review flag. Please try again.";
  }
}

/** Flag a timesheet entry for review with a short required note. */
export const flagTimeEntryFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => flagTimeEntryInput.parse(input))
  .handler(async ({ data }): Promise<TimeWriteResult> => {
    const { getSupabaseServerClient } = await import("@/lib/supabase/serverClient");
    const supabase = getSupabaseServerClient();
    const { error } = await supabase.rpc("rpc_flag_time_entry", {
      p_workspace_id: data.workspaceId,
      p_time_entry_id: data.timeEntryId,
      p_note: data.note,
    });
    if (error) return { ok: false, message: describeFlagError(error.code) };
    return { ok: true };
  });

/** Clear a review flag from a timesheet entry. */
export const unflagTimeEntryFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => unflagTimeEntryInput.parse(input))
  .handler(async ({ data }): Promise<TimeWriteResult> => {
    const { getSupabaseServerClient } = await import("@/lib/supabase/serverClient");
    const supabase = getSupabaseServerClient();
    const { error } = await supabase.rpc("rpc_unflag_time_entry", {
      p_workspace_id: data.workspaceId,
      p_time_entry_id: data.timeEntryId,
    });
    if (error) return { ok: false, message: describeFlagError(error.code) };
    return { ok: true };
  });
