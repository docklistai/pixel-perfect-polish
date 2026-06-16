import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { StoredTimesheetRow } from "../types";

/**
 * Manager-side live time & attendance reads and writes. Reads run as a server
 * function under workspace RLS (`time_entries_*_select`); approvals go through
 * `rpc_batch_approve_time_entries`, adjustments through `rpc_adjust_time_entry`,
 * and the authoritative CSV-safe export through `rpc_export_approved_hours`.
 * No browser table writes, no service-role key. Flagging and audit narratives
 * have no live column/RPC and stay demo-only. Presentation-only fields the
 * schema does not carry (avatar, exception text) are neutral defaults.
 */

const WORKSPACE_TZ = "Europe/London";
const TIME_FMT = new Intl.DateTimeFormat("en-GB", {
  timeZone: WORKSPACE_TZ,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const workspaceInput = z.object({ workspaceId: z.string().uuid() });

const approveInput = z.object({
  workspaceId: z.string().uuid(),
  timeEntryIds: z.array(z.string().uuid()).min(1),
  approvalStatus: z.enum(["approved", "rejected", "pending"]),
  reason: z.string().trim().max(2000).optional(),
});

const adjustInput = z.object({
  workspaceId: z.string().uuid(),
  timeEntryId: z.string().uuid(),
  clockedInAt: z.string().datetime().nullable(),
  clockedOutAt: z.string().datetime().nullable(),
  breakMinutes: z.number().int().min(0).max(1440),
  reason: z.string().trim().min(1).max(2000),
});

const exportInput = z.object({
  workspaceId: z.string().uuid(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export type TimeWriteResult = { ok: true } | { ok: false; message: string };
export type ExportRow = {
  staffMemberId: string;
  displayName: string;
  roleName: string;
  departmentName: string;
  entryCount: number;
  approvedHours: number;
};
export type ExportResult = { ok: true; rows: ExportRow[] } | { ok: false; message: string };

interface TimeEntryRow {
  id: string;
  staff_member_id: string;
  work_date: string;
  scheduled_start_at: string | null;
  scheduled_end_at: string | null;
  clocked_in_at: string | null;
  clocked_out_at: string | null;
  break_minutes: number;
  approval_status: "pending" | "approved" | "rejected";
}

interface StaffLite {
  display_name: string;
  role_name: string;
  department: string;
}

const STATUS_MAP: Record<TimeEntryRow["approval_status"], StoredTimesheetRow["status"]> = {
  pending: "pending",
  approved: "approved",
  rejected: "unapproved",
};

function clockLabel(iso: string | null): string {
  return iso ? TIME_FMT.format(new Date(iso)) : "—";
}

function scheduleLabel(startIso: string | null, endIso: string | null): string {
  if (!startIso || !endIso) return "—";
  return `${TIME_FMT.format(new Date(startIso))}–${TIME_FMT.format(new Date(endIso))}`;
}

function paidLabel(inIso: string | null, outIso: string | null, breakMinutes: number): string {
  if (!inIso || !outIso) return "—";
  const worked = Math.max(
    0,
    Math.round((new Date(outIso).getTime() - new Date(inIso).getTime()) / 60_000) - breakMinutes,
  );
  return `${Math.floor(worked / 60)} h ${String(worked % 60).padStart(2, "0")} m`;
}

function avatarIndex(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) % 4099;
  return (hash % 70) + 1;
}

function mapTimeRow(row: TimeEntryRow, staff: StaffLite | undefined): StoredTimesheetRow {
  return {
    id: row.id,
    n: staff?.display_name ?? "Team member",
    role: staff?.role_name ?? "—",
    img: avatarIndex(row.staff_member_id),
    sched: scheduleLabel(row.scheduled_start_at, row.scheduled_end_at),
    in: clockLabel(row.clocked_in_at),
    inN: "",
    out: clockLabel(row.clocked_out_at),
    outN: "",
    brk: `${row.break_minutes}m`,
    paid: paidLabel(row.clocked_in_at, row.clocked_out_at, row.break_minutes),
    exc: "—",
    department: staff?.department ?? "—",
    status: STATUS_MAP[row.approval_status],
    flagged: false,
    auditTrail: [],
    workDate: row.work_date,
  };
}

/** All time entries in the manager's workspace for the active period, newest first. */
export const fetchWorkspaceTimeFn = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => workspaceInput.parse(input))
  .handler(async ({ data }): Promise<StoredTimesheetRow[]> => {
    const { getSupabaseServerClient } = await import("@/lib/supabase/serverClient");
    const supabase = getSupabaseServerClient();

    const [
      { data: entries, error: entryError },
      { data: staff, error: staffError },
      { data: depts },
    ] = await Promise.all([
      supabase
        .from("time_entries")
        .select(
          "id, staff_member_id, work_date, scheduled_start_at, scheduled_end_at, clocked_in_at, clocked_out_at, break_minutes, approval_status",
        )
        .eq("workspace_id", data.workspaceId)
        .order("work_date", { ascending: false }),
      supabase
        .from("staff_members")
        .select("id, display_name, role_name, department_id")
        .eq("workspace_id", data.workspaceId),
      supabase.from("departments").select("id, name").eq("workspace_id", data.workspaceId),
    ]);

    if (entryError) throw entryError;
    if (staffError) throw staffError;

    const deptNames = new Map(
      ((depts as { id: string; name: string }[] | null) ?? []).map((d) => [d.id, d.name]),
    );
    const staffById = new Map<string, StaffLite>(
      (
        (staff as
          | { id: string; display_name: string; role_name: string; department_id: string | null }[]
          | null) ?? []
      ).map((s) => [
        s.id,
        {
          display_name: s.display_name,
          role_name: s.role_name,
          department: s.department_id ? (deptNames.get(s.department_id) ?? "—") : "—",
        },
      ]),
    );

    return ((entries as TimeEntryRow[] | null) ?? []).map((row) =>
      mapTimeRow(row, staffById.get(row.staff_member_id)),
    );
  });

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
      rows: ((rows as ExportRowRaw[] | null) ?? []).map((r) => ({
        staffMemberId: r.staff_member_id,
        displayName: r.display_name,
        roleName: r.role_name,
        departmentName: r.department_name ?? "",
        entryCount: Number(r.entry_count),
        approvedHours: Number(r.approved_hours),
      })),
    };
  });
