import { getSupabaseBrowserClient } from "@/lib/supabase/browserClient";
import { dayMonth, inclusiveDays } from "./portalFormatting";

export interface PortalLeaveRequest {
  id: string;
  type: string;
  date: string;
  startIso: string;
  endIso: string;
  days: number;
  reason: string;
  status: "pending" | "approved" | "declined" | "cancelled";
  submittedAt: string;
  decisionReason?: string;
}

export interface LeaveRequestViewRow {
  leave_request_id: string;
  staff_member_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: "pending" | "approved" | "declined" | "cancelled";
  submitted_at: string;
  decided_at: string | null;
  decision_reason: string | null;
}

const LEAVE_TYPE_LABEL: Record<string, string> = {
  annual_leave: "Annual leave",
  personal: "Personal leave",
  sick: "Sick leave",
  unpaid: "Unpaid leave",
  other: "Other",
};

export function mapLeaveRequest(row: LeaveRequestViewRow): PortalLeaveRequest {
  return {
    id: row.leave_request_id,
    type: LEAVE_TYPE_LABEL[row.leave_type] ?? "Leave",
    date: `${dayMonth(row.start_date)} – ${dayMonth(row.end_date)}`,
    startIso: row.start_date,
    endIso: row.end_date,
    days: inclusiveDays(row.start_date, row.end_date),
    reason: row.reason,
    status: row.status,
    submittedAt: dayMonth(row.submitted_at.slice(0, 10)),
    decisionReason:
      row.status === "cancelled"
        ? (row.decision_reason ?? "Withdrawn by staff")
        : (row.decision_reason ?? undefined),
  };
}

export function upcomingApprovedLeaveRequests(
  requests: PortalLeaveRequest[],
  todayIso: string,
): PortalLeaveRequest[] {
  return requests
    .filter((request) => request.status === "approved" && request.endIso >= todayIso)
    .sort((a, b) => a.startIso.localeCompare(b.startIso));
}

export async function fetchPortalLeaveRequests(
  workspaceId: string,
  staffMemberId: string,
): Promise<PortalLeaveRequest[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("staff_portal_leave_requests")
    .select(
      "leave_request_id, staff_member_id, leave_type, start_date, end_date, reason, status, submitted_at, decided_at, decision_reason",
    )
    .eq("workspace_id", workspaceId)
    .eq("staff_member_id", staffMemberId)
    .order("submitted_at", { ascending: false });

  if (error) throw error;
  return ((data as LeaveRequestViewRow[] | null) ?? []).map(mapLeaveRequest);
}
