export type ShiftReleaseStatus =
  | "pending"
  | "withdrawn"
  | "approved"
  | "declined"
  | "completed"
  | "stale";

export interface ShiftReleaseStatusPresentation {
  label: string;
  tone: "success" | "warning" | "info" | "danger" | "muted";
  responsibilityContinues: boolean;
}

const PRESENTATION: Record<ShiftReleaseStatus, ShiftReleaseStatusPresentation> = {
  pending: { label: "Pending", tone: "warning", responsibilityContinues: true },
  withdrawn: { label: "Withdrawn", tone: "muted", responsibilityContinues: true },
  approved: {
    label: "Approved — awaiting rota update",
    tone: "info",
    responsibilityContinues: true,
  },
  declined: { label: "Declined", tone: "danger", responsibilityContinues: true },
  completed: { label: "Completed", tone: "success", responsibilityContinues: false },
  stale: { label: "Rota changed", tone: "warning", responsibilityContinues: false },
};

export function shiftReleaseStatusPresentation(
  status: ShiftReleaseStatus,
): ShiftReleaseStatusPresentation {
  return PRESENTATION[status];
}

export function canRequestShiftRelease(status: ShiftReleaseStatus | null): boolean {
  return status === null || status === "withdrawn";
}
