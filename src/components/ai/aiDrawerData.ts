import { AlertTriangle, Plane, Clock, type LucideIcon } from "lucide-react";

/** Live counts the support drawer reasons over. All sourced from the workspace store. */
export interface AiWorkspaceContext {
  pendingLeaveCount: number;
  approvedLeaveCount: number;
  pendingTimeCount: number;
  approvedTimeCount: number;
  openShiftCount: number;
}

export type SupportRoute = "/rota" | "/leave" | "/time";

/**
 * A single bounded manager-support topic: a fixed label, a deterministic
 * one-line review note built from live counts, and a route into a real screen.
 * No free text, no computation beyond the counts shown, no writes.
 */
export interface SupportTopic {
  id: string;
  icon: LucideIcon;
  label: string;
  note: string;
  route: SupportRoute;
  routeLabel: string;
}

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

/** Builds the fixed set of support topics from live workspace counts. */
export function buildSupportTopics(context: AiWorkspaceContext): SupportTopic[] {
  return [
    {
      id: "rota-review",
      icon: AlertTriangle,
      label: "Rota review",
      note:
        context.openShiftCount > 0
          ? `${plural(context.openShiftCount, "open shift")} in this week's draft to assign before publishing.`
          : "No open shifts in this week's draft. Review the rota before publishing.",
      route: "/rota",
      routeLabel: "Open rota",
    },
    {
      id: "coverage-check",
      icon: Plane,
      label: "Coverage check",
      note:
        context.pendingLeaveCount > 0 || context.approvedLeaveCount > 0
          ? `${plural(context.pendingLeaveCount, "pending")} and ${context.approvedLeaveCount} approved leave request${context.approvedLeaveCount === 1 ? "" : "s"} to check against coverage.`
          : "No leave requests recorded. Not enough data for a coverage note.",
      route: "/leave",
      routeLabel: "Open leave",
    },
    {
      id: "time-review",
      icon: Clock,
      label: "Timesheets to review",
      note:
        context.pendingTimeCount > 0
          ? `${plural(context.pendingTimeCount, "timesheet")} awaiting review; ${context.approvedTimeCount} approved.`
          : `No timesheets awaiting review; ${context.approvedTimeCount} approved.`,
      route: "/time",
      routeLabel: "Open time",
    },
  ];
}
