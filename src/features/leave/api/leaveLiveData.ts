import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { LeaveRequest } from "../types";

/**
 * Manager-side live leave reads and decisions. Reads run as a server function
 * under workspace RLS (`leave_requests_staff_or_manager_select`); the decision
 * goes through `rpc_decide_leave_request`, which writes the transition, an
 * immutable event, the staff notification, and an audit record in one
 * transaction. No browser table write, no service-role key. Presentation-only
 * fields the schema does not carry (avatar, balance, coverage impact) are
 * derived deterministically so the existing Leave UI renders unchanged.
 */

const workspaceInput = z.object({ workspaceId: z.string().uuid() });

const decideInput = z.object({
  workspaceId: z.string().uuid(),
  leaveRequestId: z.string().uuid(),
  status: z.enum(["approved", "declined", "pending"]),
  reason: z.string().trim().max(2000).optional(),
});

export type DecideLeaveResult = { ok: true } | { ok: false; message: string };

interface LeaveRequestRow {
  id: string;
  staff_member_id: string;
  leave_type: "annual_leave" | "personal" | "sick" | "unpaid" | "other";
  start_date: string;
  end_date: string;
  reason: string;
  status: "pending" | "approved" | "declined" | "cancelled";
  submitted_at: string;
  decided_at: string | null;
  decision_reason: string | null;
}

interface StaffLite {
  display_name: string;
  role_name: string;
  department: string;
}

const TYPE_LABEL: Record<LeaveRequestRow["leave_type"], string> = {
  annual_leave: "Annual leave",
  personal: "Personal leave",
  sick: "Sick leave",
  unpaid: "Unpaid leave",
  other: "Other",
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function dayMonth(isoDate: string): string {
  const [, m, d] = isoDate.split("-").map(Number);
  return `${d} ${MONTHS[(m ?? 1) - 1]}`;
}

function inclusiveDays(startIso: string, endIso: string): number {
  const ms =
    new Date(`${endIso}T00:00:00Z`).getTime() - new Date(`${startIso}T00:00:00Z`).getTime();
  return Math.max(1, Math.round(ms / 86_400_000) + 1);
}

function noticeDays(submittedAt: string, startIso: string): number {
  const ms = new Date(`${startIso}T00:00:00Z`).getTime() - new Date(submittedAt).getTime();
  return Math.max(0, Math.round(ms / 86_400_000));
}

function avatarIndex(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) % 4099;
  return (hash % 70) + 1;
}

function mapLeaveRequest(row: LeaveRequestRow, staff: StaffLite | undefined): LeaveRequest {
  const days = inclusiveDays(row.start_date, row.end_date);
  const impact: LeaveRequest["impact"] = days >= 5 ? "High" : days >= 3 ? "Medium" : "Low";
  const tone: LeaveRequest["tone"] =
    impact === "High" ? "danger" : impact === "Medium" ? "warning" : "success";
  const state: LeaveRequest["state"] = row.status === "cancelled" ? "declined" : row.status;
  return {
    id: row.id,
    staffId: row.staff_member_id,
    n: staff?.display_name ?? "Team member",
    role: staff?.role_name ?? "—",
    dept: staff?.department ?? "—",
    date: `${dayMonth(row.start_date)} – ${dayMonth(row.end_date)}`,
    startIso: row.start_date,
    endIso: row.end_date,
    days,
    type: TYPE_LABEL[row.leave_type],
    impact,
    tone,
    state,
    notice: noticeDays(row.submitted_at, row.start_date),
    reason: row.reason,
    img: avatarIndex(row.staff_member_id),
    balance: "—",
    submitted: dayMonth(row.submitted_at.slice(0, 10)),
    coverNote: row.decision_reason ?? "",
  };
}

/** Every leave request in the manager's workspace, newest submission first. */
export const fetchWorkspaceLeaveFn = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => workspaceInput.parse(input))
  .handler(async ({ data }): Promise<LeaveRequest[]> => {
    const { getSupabaseServerClient } = await import("@/lib/supabase/serverClient");
    const supabase = getSupabaseServerClient();

    const [
      { data: requests, error: reqError },
      { data: staff, error: staffError },
      { data: depts },
    ] = await Promise.all([
      supabase
        .from("leave_requests")
        .select(
          "id, staff_member_id, leave_type, start_date, end_date, reason, status, submitted_at, decided_at, decision_reason",
        )
        .eq("workspace_id", data.workspaceId)
        .order("submitted_at", { ascending: false }),
      supabase
        .from("staff_members")
        .select("id, display_name, role_name, department_id")
        .eq("workspace_id", data.workspaceId),
      supabase.from("departments").select("id, name").eq("workspace_id", data.workspaceId),
    ]);

    if (reqError) throw reqError;
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

    return ((requests as LeaveRequestRow[] | null) ?? []).map((row) =>
      mapLeaveRequest(row, staffById.get(row.staff_member_id)),
    );
  });

/** Approve / decline / reopen a leave request via the SECURITY DEFINER RPC. */
export const decideLeaveRequestFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => decideInput.parse(input))
  .handler(async ({ data }): Promise<DecideLeaveResult> => {
    const { getSupabaseServerClient } = await import("@/lib/supabase/serverClient");
    const supabase = getSupabaseServerClient();

    const { error } = await supabase.rpc("rpc_decide_leave_request", {
      p_workspace_id: data.workspaceId,
      p_leave_request_id: data.leaveRequestId,
      p_status: data.status,
      p_reason: data.reason ?? null,
    });

    if (error) {
      const message =
        error.code === "42501"
          ? "You don't have manager access to decide this request."
          : error.code === "55000"
            ? "This request can't change to that state right now."
            : "We couldn't update the request. Please try again.";
      return { ok: false, message };
    }

    return { ok: true };
  });
