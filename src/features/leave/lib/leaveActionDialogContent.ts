import type { LeaveRequest, LeaveSource } from "../types";
import type { LeaveStaffOption } from "./leaveRequests";

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
  request: Pick<LeaveRequest, "impact" | "tone">,
): ApprovalDialogRow[] {
  const impactRow: ApprovalDialogRow = {
    kind: "badge",
    label: "Coverage impact",
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

  return [
    impactRow,
    { kind: "text", label: "Leave balances", value: "Not tracked yet" },
    { kind: "text", label: "Cover check", value: "Open the rota to confirm cover" },
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
