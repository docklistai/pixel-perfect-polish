import { createServerFn } from "@tanstack/react-start";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import type { TimesheetStatus } from "../types";
import { pendingTimePreviewInput, timeOperationalCountsInput } from "./timeLiveSchemas";

export interface TimeReviewPreviewRow {
  id: string;
  n: string;
  img: number;
  status: TimesheetStatus;
  flagged: false;
}

export interface PendingTimePreviewResult {
  rows: TimeReviewPreviewRow[];
  total: number;
}

export interface TimeOperationalCounts {
  awaitingReview: number;
  approvedInWindow: number;
}

function avatarIndex(id: string): number {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) % 4099;
  }
  return (hash % 70) + 1;
}

/** All actionable history counted, but only the newest small preview is hydrated. */
export const fetchPendingTimePreviewFn = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => pendingTimePreviewInput.parse(input))
  .handler(async ({ data }): Promise<PendingTimePreviewResult> => {
    const supabase = getSupabaseServerClient();
    const {
      data: entries,
      count,
      error,
    } = await supabase
      .from("time_entries")
      .select("id, staff_member_id, approval_status", { count: "exact" })
      .eq("workspace_id", data.workspaceId)
      .neq("approval_status", "approved")
      .order("work_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (error) throw error;

    const typedEntries =
      (entries as
        | {
            id: string;
            staff_member_id: string;
            approval_status: "pending" | "rejected";
          }[]
        | null) ?? [];
    const staffIds = [...new Set(typedEntries.map((entry) => entry.staff_member_id))];
    const staffResult = staffIds.length
      ? await supabase
          .from("staff_members")
          .select("id, display_name")
          .eq("workspace_id", data.workspaceId)
          .in("id", staffIds)
      : { data: [], error: null };
    if (staffResult.error) throw staffResult.error;
    const names = new Map(
      ((staffResult.data as { id: string; display_name: string }[] | null) ?? []).map((staff) => [
        staff.id,
        staff.display_name,
      ]),
    );

    return {
      total: count ?? 0,
      rows: typedEntries.map((entry) => ({
        id: entry.id,
        n: names.get(entry.staff_member_id) ?? "Team member",
        img: avatarIndex(entry.staff_member_id),
        status: entry.approval_status === "rejected" ? "unapproved" : "pending",
        flagged: false,
      })),
    };
  });

/** Head-only counts replace full time-history reads in global operational UI. */
export const fetchTimeOperationalCountsFn = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => timeOperationalCountsInput.parse(input))
  .handler(async ({ data }): Promise<TimeOperationalCounts> => {
    const supabase = getSupabaseServerClient();
    const [awaiting, approved] = await Promise.all([
      supabase
        .from("time_entries")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", data.workspaceId)
        .neq("approval_status", "approved"),
      supabase
        .from("time_entries")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", data.workspaceId)
        .eq("approval_status", "approved")
        .gte("work_date", data.startDate)
        .lte("work_date", data.endDate),
    ]);
    if (awaiting.error) throw awaiting.error;
    if (approved.error) throw approved.error;
    return { awaitingReview: awaiting.count ?? 0, approvedInWindow: approved.count ?? 0 };
  });
