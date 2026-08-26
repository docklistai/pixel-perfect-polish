import type { LeaveRequest, LeaveSource } from "../types";
import type { LeaveStaffOption } from "./leaveRequests";
import type { LeaveBalance } from "./leaveBalance";
import {
  CALENDAR_DAYS_LABEL,
  formatEntitlementSummary,
  formatPendingSummary,
} from "./leaveBalancePresentation";

/** Display label the live mapper gives `annual_leave`. */
export const ANNUAL_LEAVE_LABEL = "Annual leave";

/**
 * True when this request draws on annual entitlement. Sick, unpaid, personal
 * and other never do, so their approval dialog shows no annual balance at all
 * rather than implying one was consumed.
 */
export function consumesAnnualEntitlement(request: Pick<LeaveRequest, "type">): boolean {
  return request.type === ANNUAL_LEAVE_LABEL;
}

export type ApprovalDialogRow =
  | {
      kind: "badge";
      label: string;
      value: LeaveRequest["impact"];
      tone: LeaveRequest["tone"];
    }
  | {
      kind: "text";
      label: string;
      value: string;
    };

export const demoManagerCreateStaffOptions: LeaveStaffOption[] = [
  { id: "james-walker", name: "James Walker", role: "Waiter", dept: "Front of House", img: 14 },
  { id: "amelia-stone", name: "Amelia Stone", role: "Housekeeper", dept: "Housekeeping", img: 23 },
  { id: "noah-evans", name: "Noah Evans", role: "Porter", dept: "Maintenance", img: 33 },
];

export function approvalDialogRows(
  source: LeaveSource,
  request: Pick<LeaveRequest, "impact" | "tone" | "type">,
  balance: LeaveBalance | null = null,
): ApprovalDialogRow[] {
  const impactRow: ApprovalDialogRow = {
    kind: "badge",
    label: "Request length",
    value: request.impact,
    tone: request.tone,
  };

  if (source === "demo") {
    return [
      impactRow,
      { kind: "text", label: "Days remaining after", value: "11 / 28" },
      { kind: "text", label: "Other staff off these days", value: "2 already approved" },
    ];
  }

  const coverRow: ApprovalDialogRow = {
    kind: "text",
    label: "Cover check",
    value: "Open the rota to confirm cover",
  };

  // Balance is manager CONTEXT only. It never gates the decision: Approve stays
  // enabled at any remaining figure, including a negative one.
  if (!consumesAnnualEntitlement(request)) {
    return [
      impactRow,
      { kind: "text", label: "Annual leave", value: "Not affected by this leave type" },
      coverRow,
    ];
  }

  if (!balance) {
    return [impactRow, { kind: "text", label: "Annual leave", value: "Not tracked yet" }, coverRow];
  }

  const pending = formatPendingSummary(balance);
  return [
    impactRow,
    { kind: "text", label: "Annual leave", value: formatEntitlementSummary(balance) },
    {
      kind: "text",
      label: "Pending",
      value: pending
        ? `${pending} · ${CALENDAR_DAYS_LABEL.toLowerCase()}`
        : `None · ${CALENDAR_DAYS_LABEL.toLowerCase()}`,
    },
    coverRow,
  ];
}

export function managerCreateDialogState(source: LeaveSource): {
  canCreate: boolean;
  description: string;
  unavailableTitle?: string;
  unavailableBody?: string;
} {
  if (source === "demo") {
    return { canCreate: true, description: "On behalf of a team member" };
  }

  return {
    canCreate: false,
    description: "Staff portal submissions only",
    unavailableTitle: "Manager-created leave is not connected yet",
    unavailableBody:
      "Staff can submit leave from the portal. Managers can review, approve, decline, or reopen those requests here once submitted.",
  };
}
