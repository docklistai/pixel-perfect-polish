import {
  AlertTriangle,
  CalendarClock,
  Clock3,
  HelpCircle,
  Plane,
  RefreshCw,
  Send,
  UserMinus,
  UserPlus,
} from "lucide-react";
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
  /** Pending open-shift requests from staff. */
  openShiftRequestCount?: number;
  /** Pending shift release requests from staff. */
  shiftReleaseRequestCount?: number;
  /** Pending one-off unavailability or recurring day off requests from staff. */
  availabilityRequestCount?: number;
  /** Pending staff hours queries (slot for WS-12). */
  timeQueryCount?: number;
}

const s = (count: number) => (count === 1 ? "" : "s");

/**
 * Build the ordered attention queue.
 *
 * Fixed order:
 * 1. Rota issues
 * 2. Open shifts
 * 3. Open-shift requests
 * 4. Shift release requests
 * 5. Availability / day-off requests
 * 6. Unpublished changes
 * 7. Pending leave
 * 8. Hours queries
 * 9. Pending timesheets
 *
 * Inactive categories are dropped entirely rather than rendered as zeros.
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

  const openShiftRequestCount = input.openShiftRequestCount ?? 0;
  const shiftReleaseRequestCount = input.shiftReleaseRequestCount ?? 0;
  const availabilityRequestCount = input.availabilityRequestCount ?? 0;
  const timeQueryCount = input.timeQueryCount ?? 0;

  // An open operational issue makes the server report unpublished work by
  // definition (see hasUnpublishedWork), so the two rota signals describe one
  // cause. The specific item wins and the generic notice is suppressed,
  // otherwise a single leave change would be counted twice.
  const rotaIssuesActive = rotaIssuesResolved && rotaIssueCount > 0;

  const candidates: (AttentionItem | null)[] = [
    // 1. Rota issues
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

    // 2. Open shifts
    openShifts > 0
      ? {
          t: `${weekScopeHeading(weekScope)} has ${openShifts} open shift${s(openShifts)}`,
          s: "Open shifts do not block publishing",
          icon: AlertTriangle,
          tone: "warning" as const,
          route: "/rota" as const,
          cta: "Open rota",
          tag: "Action needed",
          detail: `${weekScopePossessive(weekScope)} draft has ${openShifts} unassigned shift${s(openShifts)}. You can assign cover or publish with open shifts.`,
        }
      : null,

    // 3. Open-shift requests
    openShiftRequestCount > 0
      ? {
          t: `${openShiftRequestCount} open-shift request${s(openShiftRequestCount)} pending`,
          s: "Staff applied for unassigned shifts",
          icon: UserPlus,
          tone: "warning" as const,
          route: "/rota" as const,
          cta: "Review requests",
          tag: "Action needed",
          detail: `${openShiftRequestCount} team member${s(openShiftRequestCount)} requested an open shift. Review and confirm cover on the rota.`,
        }
      : null,

    // 4. Shift release requests
    shiftReleaseRequestCount > 0
      ? {
          t: `${shiftReleaseRequestCount} shift release request${s(shiftReleaseRequestCount)} pending`,
          s: "Staff asked to give up assigned shifts",
          icon: UserMinus,
          tone: "warning" as const,
          route: "/rota" as const,
          cta: "Review releases",
          tag: "Action needed",
          detail: `${shiftReleaseRequestCount} team member${s(shiftReleaseRequestCount)} asked to be released from an assigned shift. Review reasons and reassign cover if needed.`,
        }
      : null,

    // 5. Availability / day-off requests
    availabilityRequestCount > 0
      ? {
          t: `${availabilityRequestCount} availability request${s(availabilityRequestCount)} pending`,
          s: "One-off or recurring day-off requests waiting",
          icon: CalendarClock,
          tone: "warning" as const,
          route: "/staff" as const,
          cta: "Review requests",
          tag: "Action needed",
          detail: `${availabilityRequestCount} availability or recurring day-off request${s(availabilityRequestCount)} ${availabilityRequestCount === 1 ? "is" : "are"} waiting for manager review. Review on the Staff page.`,
        }
      : null,

    // 6. Unpublished changes
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

    // 7. Pending leave
    pendingLeaveCount > 0
      ? {
          t: highLeave
            ? "1 leave request — long request (5+ days)"
            : `${pendingLeaveCount} leave request${s(pendingLeaveCount)} pending`,
          s: highLeave ? `${highLeave.n} · ${highLeave.date}` : "Review against the rota",
          icon: Plane,
          tone: "purple" as const,
          route: "/leave" as const,
          cta: "Review leave",
          tag: "Decision needed",
          detail: highLeave
            ? `${highLeave.n}'s request (${highLeave.date}) needs a decision. Review it against the rota.`
            : `${pendingLeaveCount} leave request${s(pendingLeaveCount)} pending. Review each against the rota.`,
        }
      : null,

    // 8. Hours queries
    timeQueryCount > 0
      ? {
          t: `${timeQueryCount} staff hours quer${timeQueryCount === 1 ? "y" : "ies"} waiting`,
          s: "Staff queried their recorded hours",
          icon: HelpCircle,
          tone: "danger" as const,
          route: "/time" as const,
          cta: "Review queries",
          tag: "Needs review",
          detail: `${timeQueryCount} staff member${s(timeQueryCount)} queried recorded shift hours. Review and reconcile before export.`,
        }
      : null,

    // 9. Pending timesheets
    pendingTimeCount > 0
      ? {
          t: `${pendingTimeCount} timesheet${s(pendingTimeCount)} need manager review`,
          s: "Need manager review this period",
          icon: Clock3,
          tone: "danger" as const,
          route: "/time" as const,
          cta: "Review timesheets",
          tag: "Needs review",
          detail: `${pendingTimeCount} timesheet${s(pendingTimeCount)} ${pendingTimeCount === 1 ? "is" : "are"} waiting for manager review this period. Approve or query each before exporting hours.`,
        }
      : null,
  ];

  return candidates.filter((item): item is AttentionItem => item !== null);
}
