import { ANSWERS, type SimulatedAnswer } from "./aiDrawerData";

export interface AiWorkspaceContext {
  pendingLeaveCount: number;
  approvedLeaveCount: number;
  pendingTimeCount: number;
  approvedTimeCount: number;
  openShiftCount: number;
}

export function matchWorkspaceAnswer(q: string, context: AiWorkspaceContext): SimulatedAnswer {
  const lower = q.toLowerCase();
  if (lower.includes("leave impact")) {
    return {
      ...ANSWERS["Summarise leave impact for week of 15 Jun"]!,
      summary: `${context.pendingLeaveCount} requests are pending and ${context.approvedLeaveCount} are approved. Review them against the live rota before deciding.`,
    };
  }
  if (lower.includes("before publishing")) {
    return {
      ...ANSWERS["Anything I should review before publishing this week's rota?"]!,
      summary: `${context.openShiftCount} open shifts and ${context.pendingLeaveCount} pending leave requests need manager review before publishing.`,
    };
  }
  const exact = ANSWERS[q];
  if (exact) return exact;
  if (lower.startsWith("suggest a fix")) return ANSWERS["conflict-fix"]!;
  if (lower.startsWith("find cover")) return ANSWERS["find-cover"]!;
  if (lower.startsWith("summarise the open issues")) {
    return ANSWERS["Anything I should review before publishing this week's rota?"]!;
  }
  return {
    ...ANSWERS.default!,
    summary: `Live workspace context: ${context.pendingTimeCount} timesheets need review, ${context.approvedTimeCount} are approved, and ${context.pendingLeaveCount} leave requests are pending. Suggestions remain review-only.`,
  };
}
