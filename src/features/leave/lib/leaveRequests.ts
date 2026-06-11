import { DEMO_WORLD } from "@/features/demo/data/demoWorld";
import type { LeaveRequest } from "../types";
import { formatLeaveRange, leaveDaysInclusive } from "./leaveDates";

export interface LeaveStaffOption {
  id: string;
  name: string;
  role: string;
  dept: string;
  img: number;
}

interface NewLeaveRequestInput {
  staff: LeaveStaffOption;
  startIso: string;
  endIso: string;
  type: string;
  reason: string;
  source: "manager" | "portal";
}

export function buildLeaveRequest({
  staff,
  startIso,
  endIso,
  type,
  reason,
  source,
}: NewLeaveRequestInput): LeaveRequest {
  return {
    id: `leave-${Date.now()}`,
    staffId: staff.id,
    n: staff.name,
    role: staff.role,
    dept: staff.dept,
    date: formatLeaveRange(startIso, endIso),
    startIso,
    endIso,
    days: leaveDaysInclusive(startIso, endIso),
    type,
    impact: "Low",
    tone: "success",
    state: "pending",
    notice: 10,
    reason: reason.trim() || "No reason supplied.",
    img: staff.img,
    balance: "11 / 28 days",
    submitted: `Today, ${DEMO_WORLD.nowLabel} (Europe/London)`,
    coverNote:
      source === "manager"
        ? "Added by Alex Thompson for review."
        : "Submitted from the staff portal for manager review.",
  };
}
