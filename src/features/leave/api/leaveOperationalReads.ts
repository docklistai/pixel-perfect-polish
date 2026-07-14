import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { mapLeaveRequest, type LeaveRequestRow, type StaffLite } from "./leaveLiveMapper";
import type { LeaveRequest } from "../types";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const rangeInput = z.object({
  workspaceId: z.string().uuid(),
  startDate: isoDate,
  endDate: isoDate,
});
const staffRangeInput = rangeInput.extend({ staffId: z.string().uuid() });
const previewInput = z.object({
  workspaceId: z.string().uuid(),
  limit: z.number().int().min(1).max(10),
});
const workspaceInput = z.object({ workspaceId: z.string().uuid() });

const REQUEST_COLUMNS =
  "id, staff_member_id, leave_type, start_date, end_date, reason, status, submitted_at, decided_at, decision_reason";

async function managerContext(expectedWorkspaceId: string) {
  const { getSupabaseServerClient } = await import("@/lib/supabase/serverClient");
  const { requireActiveManagerWorkspaceId } =
    await import("@/features/auth/api/activeManagerWorkspace");
  const supabase = getSupabaseServerClient();
  const workspaceId = await requireActiveManagerWorkspaceId(supabase);
  if (workspaceId !== expectedWorkspaceId) throw new Error("Active workspace changed");
  return { supabase, workspaceId };
}

async function staffMap(
  supabase: SupabaseClient,
  workspaceId: string,
  staffIds: string[],
): Promise<Map<string, StaffLite>> {
  if (staffIds.length === 0) return new Map();
  const { data: staff, error: staffError } = await supabase
    .from("staff_members")
    .select("id, display_name, role_name, department_id")
    .eq("workspace_id", workspaceId)
    .in("id", staffIds);
  if (staffError) throw staffError;

  const staffRows =
    (staff as Array<{
      id: string;
      display_name: string;
      role_name: string;
      department_id: string | null;
    }> | null) ?? [];
  const departmentIds = [...new Set(staffRows.flatMap((row) => row.department_id ?? []))];
  const departments = new Map<string, string>();
  if (departmentIds.length > 0) {
    const { data, error } = await supabase
      .from("departments")
      .select("id, name")
      .eq("workspace_id", workspaceId)
      .in("id", departmentIds);
    if (error) throw error;
    for (const row of (data as Array<{ id: string; name: string }> | null) ?? []) {
      departments.set(row.id, row.name);
    }
  }
  return new Map(
    staffRows.map((row) => [
      row.id,
      {
        display_name: row.display_name,
        role_name: row.role_name,
        department: row.department_id ? (departments.get(row.department_id) ?? "-") : "-",
      },
    ]),
  );
}

async function mapRows(
  supabase: SupabaseClient,
  workspaceId: string,
  rows: LeaveRequestRow[],
): Promise<LeaveRequest[]> {
  const staff = await staffMap(supabase, workspaceId, [
    ...new Set(rows.map((row) => row.staff_member_id)),
  ]);
  return rows.map((row) => mapLeaveRequest(row, staff.get(row.staff_member_id)));
}

/** Bounded operational window plus every pending/actionable request. */
export const fetchWorkspaceLeaveFn = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => rangeInput.parse(input))
  .handler(async ({ data }): Promise<LeaveRequest[]> => {
    const { supabase, workspaceId } = await managerContext(data.workspaceId);
    const { data: requests, error } = await supabase
      .from("leave_requests")
      .select(REQUEST_COLUMNS)
      .eq("workspace_id", workspaceId)
      .or(`status.eq.pending,and(start_date.lte.${data.endDate},end_date.gte.${data.startDate})`)
      .order("submitted_at", { ascending: false });
    if (error) throw error;
    return mapRows(supabase, workspaceId, (requests as LeaveRequestRow[] | null) ?? []);
  });

/** Exact overlap read used by one viewed rota week. */
export const fetchRotaLeaveFn = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => rangeInput.parse(input))
  .handler(async ({ data }): Promise<LeaveRequest[]> => {
    const { supabase, workspaceId } = await managerContext(data.workspaceId);
    const { data: requests, error } = await supabase
      .from("leave_requests")
      .select(REQUEST_COLUMNS)
      .eq("workspace_id", workspaceId)
      .lte("start_date", data.endDate)
      .gte("end_date", data.startDate)
      .order("submitted_at", { ascending: false });
    if (error) throw error;
    return mapRows(supabase, workspaceId, (requests as LeaveRequestRow[] | null) ?? []);
  });

/** Staff-profile history stays bounded while retaining every pending request. */
export const fetchStaffLeaveFn = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => staffRangeInput.parse(input))
  .handler(async ({ data }): Promise<LeaveRequest[]> => {
    const { supabase, workspaceId } = await managerContext(data.workspaceId);
    const { data: requests, error } = await supabase
      .from("leave_requests")
      .select(REQUEST_COLUMNS)
      .eq("workspace_id", workspaceId)
      .eq("staff_member_id", data.staffId)
      .or(`status.eq.pending,and(start_date.lte.${data.endDate},end_date.gte.${data.startDate})`)
      .order("submitted_at", { ascending: false });
    if (error) throw error;
    return mapRows(supabase, workspaceId, (requests as LeaveRequestRow[] | null) ?? []);
  });

export const fetchPendingLeaveCountFn = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => workspaceInput.parse(input))
  .handler(async ({ data }): Promise<number> => {
    const { supabase, workspaceId } = await managerContext(data.workspaceId);
    const { count, error } = await supabase
      .from("leave_requests")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("status", "pending");
    if (error) throw error;
    return count ?? 0;
  });

export interface PendingLeavePreview {
  total: number;
  requests: LeaveRequest[];
}

export const fetchPendingLeavePreviewFn = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => previewInput.parse(input))
  .handler(async ({ data }): Promise<PendingLeavePreview> => {
    const { supabase, workspaceId } = await managerContext(data.workspaceId);
    const [{ data: requests, error }, { count, error: countError }] = await Promise.all([
      supabase
        .from("leave_requests")
        .select(REQUEST_COLUMNS)
        .eq("workspace_id", workspaceId)
        .eq("status", "pending")
        .order("submitted_at", { ascending: true })
        .limit(data.limit),
      supabase
        .from("leave_requests")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .eq("status", "pending"),
    ]);
    if (error) throw error;
    if (countError) throw countError;
    const rows = (requests as LeaveRequestRow[] | null) ?? [];
    return { total: count ?? 0, requests: await mapRows(supabase, workspaceId, rows) };
  });

export interface LeaveOperationalCounts {
  pending: number;
  approvedInWindow: number;
}

export const fetchLeaveOperationalCountsFn = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => rangeInput.parse(input))
  .handler(async ({ data }): Promise<LeaveOperationalCounts> => {
    const { supabase, workspaceId } = await managerContext(data.workspaceId);
    const [pending, approved] = await Promise.all([
      supabase
        .from("leave_requests")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .eq("status", "pending"),
      supabase
        .from("leave_requests")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .eq("status", "approved")
        .lte("start_date", data.endDate)
        .gte("end_date", data.startDate),
    ]);
    if (pending.error) throw pending.error;
    if (approved.error) throw approved.error;
    return { pending: pending.count ?? 0, approvedInWindow: approved.count ?? 0 };
  });
