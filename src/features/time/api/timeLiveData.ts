import { createServerFn } from "@tanstack/react-start";
import {
  adjustInput,
  approveInput,
  exportInput,
  timeRangeInput,
  type ExportResult,
  type TimeWriteResult,
} from "./timeLiveSchemas";
import { readWorkspaceTime, type WorkspaceTimeResult } from "./timeLiveRead";

export type { ExportResult, ExportRow, TimeWriteResult } from "./timeLiveSchemas";

/**
 * Manager time reads are bounded by the requested review period and one-day
 * edge buffer. Writes stay behind the existing audited RPC authority.
 */
export const fetchWorkspaceTimeFn = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => timeRangeInput.parse(input))
  .handler(async ({ data }): Promise<WorkspaceTimeResult> => readWorkspaceTime(data));

function describeWriteError(code: string | null | undefined): string {
  switch (code) {
    case "42501":
      return "You don't have manager access for this action.";
    case "P0002":
      return "One or more entries were not found in this workspace.";
    case "55000":
      return "That change isn't valid for the current entry state.";
    case "22023":
      return "Check the values and try again.";
    default:
      return "We couldn't apply the change. Please try again.";
  }
}

/** Approve / reject / reopen a batch of time entries via the RPC. */
export const batchApproveTimeFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => approveInput.parse(input))
  .handler(async ({ data }): Promise<TimeWriteResult> => {
    const { getSupabaseServerClient } = await import("@/lib/supabase/serverClient");
    const supabase = getSupabaseServerClient();
    const { error } = await supabase.rpc("rpc_batch_approve_time_entries", {
      p_workspace_id: data.workspaceId,
      p_time_entry_ids: data.timeEntryIds,
      p_approval_status: data.approvalStatus,
      p_reason: data.reason ?? null,
    });
    if (error) return { ok: false, message: describeWriteError(error.code) };
    return { ok: true };
  });

/** Rewrite a time entry's clock state via the RPC; resets approval to pending. */
export const adjustTimeEntryFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => adjustInput.parse(input))
  .handler(async ({ data }): Promise<TimeWriteResult> => {
    const { getSupabaseServerClient } = await import("@/lib/supabase/serverClient");
    const supabase = getSupabaseServerClient();
    const { error } = await supabase.rpc("rpc_adjust_time_entry", {
      p_workspace_id: data.workspaceId,
      p_time_entry_id: data.timeEntryId,
      p_clocked_in_at: data.clockedInAt,
      p_clocked_out_at: data.clockedOutAt,
      p_break_minutes: data.breakMinutes,
      p_reason: data.reason,
    });
    if (error) return { ok: false, message: describeWriteError(error.code) };
    return { ok: true };
  });

interface ExportRowRaw {
  staff_member_id: string;
  display_name: string;
  role_name: string;
  department_name: string | null;
  entry_count: number;
  approved_hours: number;
}

/** Server-authoritative, CSV-safe, audited approved-hours export. */
export const exportApprovedHoursFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => exportInput.parse(input))
  .handler(async ({ data }): Promise<ExportResult> => {
    const { getSupabaseServerClient } = await import("@/lib/supabase/serverClient");
    const supabase = getSupabaseServerClient();
    const { data: rows, error } = await supabase.rpc("rpc_export_approved_hours", {
      p_workspace_id: data.workspaceId,
      p_start_date: data.startDate,
      p_end_date: data.endDate,
    });
    if (error) return { ok: false, message: describeWriteError(error.code) };
    return {
      ok: true,
      rows: ((rows as ExportRowRaw[] | null) ?? []).map((row) => ({
        staffMemberId: row.staff_member_id,
        displayName: row.display_name,
        roleName: row.role_name,
        departmentName: row.department_name ?? "",
        entryCount: Number(row.entry_count),
        approvedHours: Number(row.approved_hours),
      })),
    };
  });
