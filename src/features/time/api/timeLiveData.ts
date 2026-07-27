import { createServerFn } from "@tanstack/react-start";
import {
  adjustInput,
  approveInput,
  exportDownloadInput,
  exportInput,
  timeRangeInput,
  type ExportDownloadResult,
  type ExportPreviewResult,
  type ExportRow,
  type TimeWriteResult,
} from "./timeLiveSchemas";
import { readWorkspaceTime, type WorkspaceTimeResult } from "./timeLiveRead";

export type {
  ExportDownloadResult,
  ExportPreviewResult,
  ExportRow,
  TimeWriteResult,
} from "./timeLiveSchemas";

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
  preview_signature?: string;
}

function toExportRows(rows: ExportRowRaw[] | null): ExportRow[] {
  return (rows ?? []).map((row) => ({
    staffMemberId: row.staff_member_id,
    displayName: row.display_name,
    roleName: row.role_name,
    departmentName: row.department_name ?? "",
    entryCount: Number(row.entry_count),
    approvedHours: Number(row.approved_hours),
  }));
}

async function describeExportFailure(
  error: { code: string; message: string },
  operation: string,
): Promise<{ ok: false; message: string; referenceId?: string }> {
  if (["22023", "42501", "P0002"].includes(error.code)) {
    return { ok: false, message: describeWriteError(error.code) };
  }
  const { reportServerError } = await import("@/lib/safe-errors");
  return {
    ok: false,
    ...reportServerError(error, { operation, fallbackMessage: describeWriteError(error.code) }),
  };
}

async function resolveExportWorkspaceId(): Promise<string | null> {
  const { getSupabaseServerClient } = await import("@/lib/supabase/serverClient");
  const { requireActiveManagerWorkspaceId } =
    await import("@/features/auth/api/activeManagerWorkspace");
  try {
    return await requireActiveManagerWorkspaceId(getSupabaseServerClient());
  } catch {
    return null;
  }
}

/**
 * Approved-hours preview. Manager-authorised and identical in data to the
 * download, but audit-free: opening the dialog, refetching on refocus and
 * cancelling now leave no `time_entries.exported` event behind. The returned
 * signature identifies exactly the rows shown, and the download presents it
 * back so an export can only ever record data the manager reviewed.
 */
export const previewApprovedHoursFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => exportInput.parse(input))
  .handler(async ({ data }): Promise<ExportPreviewResult> => {
    const { getSupabaseServerClient } = await import("@/lib/supabase/serverClient");
    const workspaceId = await resolveExportWorkspaceId();
    if (!workspaceId) return { ok: false, message: describeWriteError("42501") };

    const { data: rows, error } = await getSupabaseServerClient().rpc(
      "rpc_preview_approved_hours",
      {
        p_workspace_id: workspaceId,
        p_start_date: data.startDate,
        p_end_date: data.endDate,
        p_department_id: data.departmentId ?? null,
      },
    );
    if (error) return describeExportFailure(error, "preview_approved_hours");

    const raw = (rows as ExportRowRaw[] | null) ?? [];
    // The signature rides on every row, so an empty range returns none at all.
    // That is deliberate rather than a gap: there is nothing to export, the
    // dialog disables Download on an empty preview, and the download schema
    // requires a non-empty signature — so an empty preview simply has no
    // downloadable signature and cannot produce an audit event.
    return { ok: true, rows: toExportRows(raw), previewSignature: raw[0]?.preview_signature ?? "" };
  });

/**
 * Audited approved-hours download. Runs only on an explicit Download, and only
 * when the reviewed preview still matches the data server-side. A mismatch
 * (55000) writes no audit and returns no rows.
 */
export const downloadApprovedHoursFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => exportDownloadInput.parse(input))
  .handler(async ({ data }): Promise<ExportDownloadResult> => {
    const { getSupabaseServerClient } = await import("@/lib/supabase/serverClient");
    const workspaceId = await resolveExportWorkspaceId();
    if (!workspaceId) return { ok: false, message: describeWriteError("42501") };

    const { data: rows, error } = await getSupabaseServerClient().rpc("rpc_export_approved_hours", {
      p_workspace_id: workspaceId,
      p_start_date: data.startDate,
      p_end_date: data.endDate,
      p_department_id: data.departmentId ?? null,
      p_expected_signature: data.expectedSignature,
    });
    // 55000 is the RPC's deliberate refusal: the reviewed preview no longer
    // matches. It is not a transport failure, and it must not be reported as one.
    if (error?.code === "55000") {
      return {
        ok: false,
        staleSignature: true,
        message:
          "The approved hours changed since this preview. Nothing was exported — review the refreshed figures and confirm again.",
      };
    }
    if (error) return describeExportFailure(error, "export_approved_hours");
    return { ok: true, rows: toExportRows(rows as ExportRowRaw[] | null) };
  });
