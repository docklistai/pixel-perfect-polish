import type { ConflictSummary, ShiftId, WorkingTimeAlert } from "../types";

export type IssueTone = "danger" | "warning";

export type RotaIssue = {
  id: string;
  tone: IssueTone;
  title: string;
  why: string;
  fix: string;
  impact: string;
  shiftId?: ShiftId;
  aiPrompt: string;
};

/** Builds the "Issues to resolve" rail list from live draft data (frontend-only). */
export function buildRotaIssues(
  conflicts: ConflictSummary[],
  workingTimeAlerts: WorkingTimeAlert[],
): RotaIssue[] {
  const conflictIssues = conflicts.map<RotaIssue>((conflict) => ({
    id: `conflict-${conflict.id}`,
    tone: "danger",
    title: `Schedule conflict — ${conflict.staff}, ${conflict.day}`,
    why: conflict.cause,
    fix: conflict.guidance,
    impact: "Conflict clears and publishing is unblocked. Coverage stays accurate for the day.",
    shiftId: conflict.id,
    aiPrompt: `Suggest a fix for the conflict: ${conflict.detail} (${conflict.staff}, ${conflict.day})`,
  }));
  const workingTimeIssues = workingTimeAlerts.map<RotaIssue>((alert) => ({
    id: `working-time-${alert.staffId}`,
    tone: "warning",
    title: `Working time — ${alert.staffName}`,
    why: `${alert.staffName} is scheduled ${alert.scheduledDays} days this week, above the planned working pattern.`,
    fix: "Move one shift to a colleague who is under their contracted days, or mark a day as off.",
    impact: `${alert.staffName}'s week returns to the planned pattern and the alert clears.`,
    aiPrompt: `Find cover so ${alert.staffName} is not scheduled ${alert.scheduledDays} days this week`,
  }));
  return [...conflictIssues, ...workingTimeIssues];
}
