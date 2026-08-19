import { AlertTriangle, Clock3, Plane, RefreshCw, Send } from "lucide-react";
import type { AttentionItem } from "../types";

/**
 * The Dashboard attention queue — the ordered list of things actually waiting
 * on a manager.
 *
 * Every entry states a count the workspace already holds, the reason it is
 * here, and one destination. There is deliberately no severity, score, ranking
 * or urgency language, and an item exists only while its count is real, so the
 * panel's badge can never overstate the day.
 *
 * Order is fixed and product-decided rather than data-derived, so the queue
 * never reshuffles under a manager mid-glance.
 */

/**
 * Which week the dashboard is watching. Live reads watch the current rota week,
 * so their copy must say "this week"; the demo store watches next week's draft,
 * so it keeps "next week". The noun is data-driven, never hardcoded per surface.
 */
export type DashboardWeekScope = "current" | "next";

/** Heading noun for the watched week, e.g. "This week has 4 open shifts". */
export function weekScopeHeading(scope: DashboardWeekScope): string {
  return scope === "current" ? "This week" : "Next week";
}

/** Possessive form for the watched week, e.g. "This week's draft". */
export function weekScopePossessive(scope: DashboardWeekScope): string {
  return scope === "current" ? "This week's" : "Next week's";
}

/** The single high-impact leave request, when the pending set contains one. */
export interface AttentionHighLeave {
  n: string;
  date: string;
}

export interface DashboardAttentionInput {
  weekScope: DashboardWeekScope;
  /** Unassigned shifts in the watched week. */
  openShifts: number;
  /** Exact count of timesheets awaiting manager review. */
  pendingTimeCount: number;
  /** Exact count of leave requests awaiting a decision. */
  pendingLeaveCount: number;
  highLeave: AttentionHighLeave | null;
  /**
   * Open rota operational issues for the watched week. Trusted only once
   * `rotaIssuesResolved` is true, so a loading or failed read is never
   * presented as "no issues".
   */
  rotaIssueCount: number;
  rotaIssuesResolved: boolean;
  /** True when a published snapshot exists for the watched week. */
  hasPublishedSnapshot: boolean;
  /** True when the draft holds work the team has not been shown yet. */
  hasUnpublishedChanges: boolean;
}

const s = (count: number) => (count === 1 ? "" : "s");

/**
 * Build the ordered attention queue.
 *
 * Fixed order: rota update required, open shifts, unpublished changes, pending
 * leave, pending timesheets. Inactive categories are dropped entirely rather
 * than rendered as zeros.
 */
export function buildAttentionItems(input: DashboardAttentionInput): AttentionItem[] {
  const {
    weekScope,
    openShifts,
    pendingTimeCount,
    pendingLeaveCount,
    highLeave,
    rotaIssueCount,
    rotaIssuesResolved,
    hasPublishedSnapshot,
    hasUnpublishedChanges,
  } = input;

  // An open operational issue makes the server report unpublished work by
  // definition (see hasUnpublishedWork), so the two rota signals describe one
  // cause. The specific item wins and the generic notice is suppressed,
  // otherwise a single leave change would be counted twice.
  const rotaIssuesActive = rotaIssuesResolved && rotaIssueCount > 0;

  const candidates: (AttentionItem | null)[] = [
    rotaIssuesActive
      ? {
          t: `${rotaIssueCount} leave change${s(rotaIssueCount)} need${rotaIssueCount === 1 ? "s" : ""} a rota update`,
          s: `Leave changed after ${weekScopePossessive(weekScope).toLowerCase()} rota was published`,
          icon: RefreshCw,
          tone: "warning" as const,
          route: "/leave" as const,
          cta: "Review leave request",
          tag: "Action needed",
          detail: `${rotaIssueCount} leave request${s(rotaIssueCount)} changed after ${weekScopePossessive(weekScope).toLowerCase()} rota was published. Review the affected assignment, update the draft if needed, then explicitly republish. ${rotaIssueCount === 1 ? "It stays" : "They stay"} open until publication.`,
        }
      : null,
    openShifts > 0
      ? {
          t: `${weekScopeHeading(weekScope)} has ${openShifts} open shift${s(openShifts)}`,
          s: "Resolve open shifts before publishing",
          icon: AlertTriangle,
          tone: "warning" as const,
          route: "/rota" as const,
          cta: "Open rota",
          tag: "Action needed",
          detail: `${weekScopePossessive(weekScope)} draft has ${openShifts} unassigned shift${s(openShifts)}. Open the rota to assign cover before you publish.`,
        }
      : null,
    hasPublishedSnapshot && hasUnpublishedChanges && !rotaIssuesActive
      ? {
          t: `${weekScopeHeading(weekScope)} has unpublished changes`,
          s: "Your team is still seeing the last published version",
          icon: Send,
          tone: "warning" as const,
          route: "/rota" as const,
          cta: "Review & publish",
          tag: "Not published",
          detail: `${weekScopePossessive(weekScope)} draft has changes that have not been published, so your team is still seeing the last published version. Review the draft and republish when it is ready.`,
        }
      : null,
    pendingLeaveCount > 0
      ? {
          t: highLeave
            ? "1 leave request — high coverage impact"
            : `${pendingLeaveCount} leave request${s(pendingLeaveCount)} pending`,
          s: highLeave ? `${highLeave.n} · ${highLeave.date}` : "Review against the rota",
          icon: Plane,
          tone: "purple" as const,
          route: "/leave" as const,
          cta: "Review leave",
          tag: "Decision needed",
          detail: highLeave
            ? `${highLeave.n}'s request (${highLeave.date}) needs a decision and may affect coverage. Review it against the rota.`
            : `${pendingLeaveCount} leave request${s(pendingLeaveCount)} pending. Review each against the rota.`,
        }
      : null,
    pendingTimeCount > 0
      ? {
          t: `${pendingTimeCount} timesheet${s(pendingTimeCount)} need manager review`,
          s: "Export approved hours after review",
          icon: Clock3,
          tone: "danger" as const,
          route: "/time" as const,
          cta: "Review timesheets",
          tag: "Needs review",
          detail: `${pendingTimeCount} timesheet${s(pendingTimeCount)} ${pendingTimeCount === 1 ? "is" : "are"} waiting for manager review. Approve or query each before exporting hours.`,
        }
      : null,
  ];

  return candidates.filter((item): item is AttentionItem => item !== null);
}
