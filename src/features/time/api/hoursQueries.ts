import { createServerFn } from "@tanstack/react-start";
import { hoursQueriesInput, resolveHoursQueryInput, type TimeWriteResult } from "./timeLiveSchemas";
import type { TimeQuery } from "../types";

const ISSUE_TYPE_LABELS: Record<string, string> = {
  missing_clock_out: "Missing clock-out",
  incorrect_times: "Incorrect times",
  incorrect_break: "Incorrect break",
  missing_shift: "Missing shift",
  other: "Hours query",
};

function avatarIndex(id: string): number {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) % 4099;
  }
  return (hash % 70) + 1;
}

interface RawQueryRow {
  id: string;
  workspace_id: string;
  time_entry_id: string;
  staff_member_id: string;
  issue_type: string;
  note: string;
  status: "pending" | "resolved" | "dismissed";
  resolution_note: string | null;
  resolved_at: string | null;
  created_at: string;
  time_entries?: { work_date: string } | Array<{ work_date: string }> | null;
}

/** Fetch hours queries for a workspace, ordered by newest first. */
export const fetchHoursQueriesFn = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => hoursQueriesInput.parse(input))
  .handler(async ({ data }): Promise<TimeQuery[]> => {
    const { getSupabaseServerClient } = await import("@/lib/supabase/serverClient");
    const supabase = getSupabaseServerClient();

    let query = supabase
      .from("time_hours_queries")
      .select(
        "id, workspace_id, time_entry_id, staff_member_id, issue_type, note, status, resolution_note, resolved_at, created_at, time_entries(work_date)",
      )
      .eq("workspace_id", data.workspaceId)
      .order("created_at", { ascending: false });

    if (data.status) {
      query = query.eq("status", data.status);
    }

    const { data: rows, error } = await query;
    if (error) throw error;
    const typedRows = (rows as unknown as RawQueryRow[] | null) ?? [];

    const staffIds = [...new Set(typedRows.map((r) => r.staff_member_id))];
    const staffResult = staffIds.length
      ? await supabase
          .from("staff_members")
          .select("id, display_name")
          .eq("workspace_id", data.workspaceId)
          .in("id", staffIds)
      : { data: [], error: null };
    if (staffResult.error) throw staffResult.error;

    const names = new Map(
      ((staffResult.data as { id: string; display_name: string }[] | null) ?? []).map((s) => [
        s.id,
        s.display_name,
      ]),
    );

    return typedRows.map((r) => {
      const issueLabel = ISSUE_TYPE_LABELS[r.issue_type] ?? "Hours query";
      const workDate = Array.isArray(r.time_entries)
        ? (r.time_entries[0]?.work_date ?? "")
        : (r.time_entries?.work_date ?? "");
      const dateLabel = workDate ? ` — ${workDate}` : "";
      return {
        id: r.id,
        n: names.get(r.staff_member_id) ?? "Team member",
        t: `${issueLabel}${dateLabel}`,
        st: r.status === "pending" ? "Pending" : r.status === "resolved" ? "Resolved" : "Dismissed",
        stTone: r.status === "pending" ? "danger" : "info",
        img: avatarIndex(r.staff_member_id),
        timeEntryId: r.time_entry_id,
        issueType: r.issue_type,
        note: r.note,
        createdAt: r.created_at,
        resolvedAt: r.resolved_at,
        resolutionNote: r.resolution_note,
      };
    });
  });

function describeResolveError(code: string | null | undefined): string {
  switch (code) {
    case "42501":
      return "You don't have manager access for this action.";
    case "P0002":
      return "The hours query was not found in this workspace.";
    case "22023":
      return "Invalid query resolution values.";
    default:
      return "We couldn't resolve the hours query. Please try again.";
  }
}

/** Resolve or dismiss an hours query via the RPC. */
export const resolveHoursQueryFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => resolveHoursQueryInput.parse(input))
  .handler(async ({ data }): Promise<TimeWriteResult> => {
    const { getSupabaseServerClient } = await import("@/lib/supabase/serverClient");
    const supabase = getSupabaseServerClient();
    const { error } = await supabase.rpc("rpc_resolve_hours_query", {
      p_workspace_id: data.workspaceId,
      p_query_id: data.queryId,
      p_status: data.status,
      p_resolution_note: data.resolutionNote ?? null,
    });
    if (error) return { ok: false, message: describeResolveError(error.code) };
    return { ok: true };
  });
