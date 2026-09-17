import { createServerFn } from "@tanstack/react-start";
import { staffHoursQueryInput } from "@/features/time/api/timeLiveSchemas";

export type RaiseHoursQueryResult = { ok: true; queryId: string } | { ok: false; message: string };

function describeRaiseError(code: string | null | undefined): string {
  switch (code) {
    case "42501":
      return "You can only query your own recorded shift hours.";
    case "P0002":
      return "The timesheet entry was not found in this workspace.";
    case "22023":
      return "Please select a query reason and provide a brief note.";
    default:
      return "We couldn't submit your query. Please try again.";
  }
}

/** Staff raises a structured query on a recorded time entry via the RPC. */
export const raiseHoursQueryFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => staffHoursQueryInput.parse(input))
  .handler(async ({ data }): Promise<RaiseHoursQueryResult> => {
    const { getSupabaseServerClient } = await import("@/lib/supabase/serverClient");
    const supabase = getSupabaseServerClient();
    const { data: queryId, error } = await supabase.rpc("rpc_staff_raise_hours_query", {
      p_workspace_id: data.workspaceId,
      p_time_entry_id: data.timeEntryId,
      p_issue_type: data.issueType,
      p_note: data.note,
    });
    if (error) return { ok: false, message: describeRaiseError(error.code) };
    return { ok: true, queryId: queryId as string };
  });
