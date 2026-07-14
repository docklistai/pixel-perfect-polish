import { leaveStateFromStatus } from "../lib/leaveCards";
import type { LeaveRequest } from "../types";

export interface LeaveRequestRow {
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

export interface StaffLite {
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
  const [, month, day] = isoDate.split("-").map(Number);
  return `${day} ${MONTHS[(month ?? 1) - 1]}`;
}

function inclusiveDays(startIso: string, endIso: string): number {
  return Math.max(
    1,
    Math.round(
      (Date.parse(`${endIso}T00:00:00Z`) - Date.parse(`${startIso}T00:00:00Z`)) / 86_400_000,
    ) + 1,
  );
}

function noticeDays(submittedAt: string, startIso: string): number {
  return Math.max(
    0,
    Math.round((Date.parse(`${startIso}T00:00:00Z`) - Date.parse(submittedAt)) / 86_400_000),
  );
}

function avatarIndex(id: string): number {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) % 4099;
  }
  return (hash % 70) + 1;
}

export function mapLeaveRequest(row: LeaveRequestRow, staff?: StaffLite): LeaveRequest {
  const days = inclusiveDays(row.start_date, row.end_date);
  const impact = days >= 5 ? "High" : days >= 3 ? "Medium" : "Low";
  const tone = impact === "High" ? "danger" : impact === "Medium" ? "warning" : "success";
  const state = leaveStateFromStatus(row.status);
  return {
    id: row.id,
    staffId: row.staff_member_id,
    n: staff?.display_name ?? "Team member",
    role: staff?.role_name ?? "-",
    dept: staff?.department ?? "-",
    date: `${dayMonth(row.start_date)} - ${dayMonth(row.end_date)}`,
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
    balance: "-",
    submitted: dayMonth(row.submitted_at.slice(0, 10)),
    coverNote: row.decision_reason ?? "",
    cancellationSource:
      row.status === "cancelled" ? (row.decided_at ? "manager" : "staff") : undefined,
    decisionHistory:
      row.decided_at && row.decision_reason
        ? [{ state, reason: row.decision_reason, at: row.decided_at }]
        : undefined,
  };
}
