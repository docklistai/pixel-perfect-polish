import type { LeaveRequest } from "@/features/leave/types";
import type { StoredTimesheetRow } from "@/features/time/types";
import type { AttentionItem, LeaveItem, TimesheetItem } from "../types";
import {
  buildAttentionItems,
  weekScopeHeading,
  weekScopePossessive,
  type DashboardWeekScope,
} from "./dashboardAttention";

/**
 * Pure derivation of the Dashboard's operational surfaces from already-pending
 * inputs. Shared by the demo store hook and the live workspace hook so both
 * paths produce identical attention/leave/timesheet output — the only
 * difference between demo and live is where the inputs come from, never how
 * they are presented. Kept free of React/Supabase so the rules are unit-tested.
 *
 * The attention queue itself lives in `dashboardAttention.ts`; this module owns
 * the leave and timesheet lists and hands the queue its already-resolved counts.
 */

// Re-exported so existing consumers keep one import site for week-scope copy.
export { weekScopeHeading, weekScopePossessive };
export type { DashboardWeekScope };

/** Manager-support card title with correct singular/plural for the active count. */
export function dashboardAttentionTitle(activeCategories: number): string {
  if (activeCategories === 0) return "Nothing needs your attention right now";
  return `${activeCategories} thing${activeCategories === 1 ? "" : "s"} worth your attention today`;
}

/** Manager-support card body; the week noun follows the watched week's scope. */
export function dashboardAttentionSummary(input: {
  weekScope: DashboardWeekScope;
  openShifts: number;
  pendingTime: number;
  pendingLeave: number;
}): string {
  const { weekScope, openShifts, pendingTime, pendingLeave } = input;
  if (openShifts === 0 && pendingTime === 0 && pendingLeave === 0) {
    return `${weekScopePossessive(weekScope)} draft has no open shifts, and no timesheets or leave requests are waiting on you.`;
  }
  const shiftPart =
    openShifts === 0
      ? `${weekScopePossessive(weekScope)} draft has no open shifts`
      : `${weekScopePossessive(weekScope)} draft has ${openShifts} open shift${openShifts === 1 ? "" : "s"}`;
  const timePart =
    pendingTime === 0
      ? "No timesheets need manager review"
      : `${pendingTime} timesheet${pendingTime === 1 ? "" : "s"} need${pendingTime === 1 ? "s" : ""} manager review`;
  const leavePart =
    pendingLeave === 0
      ? "no leave requests are pending"
      : `${pendingLeave} leave request${pendingLeave === 1 ? "" : "s"} ${pendingLeave === 1 ? "is" : "are"} pending`;
  return `${shiftPart}. ${timePart} and ${leavePart}.`;
}

export interface DashboardOperationalInput {
  /** Unassigned shifts in the week the dashboard is watching. */
  openShifts: number;
  /** Which week the surfaced numbers describe, so copy uses the right noun. */
  weekScope: DashboardWeekScope;
  /** Leave requests already filtered to the pending state. */
  pendingLeave: LeaveRequest[];
  /** Exact head-only count when `pendingLeave` is only a small live preview. */
  pendingLeaveCount?: number;
  /** Timesheet rows already filtered to a non-approved status. */
  pendingTime: Array<Pick<StoredTimesheetRow, "id" | "n" | "img" | "status" | "flagged">>;
  /** Exact head-only count when `pendingTime` is only a small live preview. */
  pendingTimeCount?: number;
  /**
   * Subtitle for each timesheet row. The demo passes its fixed period; live
   * passes an honest period label rather than fabricating a per-row range.
   */
  timesheetPeriodLabel: string;
  /**
   * Open rota operational issues for the watched week, and whether that read
   * has actually resolved. Absent for callers with no live rota week, which is
   * why an unresolved read is never treated as "no issues".
   */
  rotaIssueCount?: number;
  rotaIssuesResolved?: boolean;
  /** Publish state of the watched week, for the unpublished-changes signal. */
  hasPublishedSnapshot?: boolean;
  hasUnpublishedChanges?: boolean;
}

export interface DashboardOperationalOutput {
  leaveItems: LeaveItem[];
  timesheetItems: TimesheetItem[];
  attentionItems: AttentionItem[];
}

export function buildDashboardOperational(
  input: DashboardOperationalInput,
): DashboardOperationalOutput {
  const { openShifts, weekScope, pendingLeave, pendingTime, timesheetPeriodLabel } = input;
  const pendingTimeCount = input.pendingTimeCount ?? pendingTime.length;
  const pendingLeaveCount = input.pendingLeaveCount ?? pendingLeave.length;
  const highLeave = pendingLeave.find((request) => request.impact === "High");

  const leaveItems: LeaveItem[] = pendingLeave.map((request) => ({
    n: request.n,
    d: `${request.date}  (${request.days} days)`,
    img: request.img,
    impact: request.impact === "Medium" ? "Moderate" : request.impact,
    impactTone: request.tone,
  }));

  const timesheetItems: TimesheetItem[] = pendingTime.map((row) => ({
    id: row.id,
    n: row.n,
    d: timesheetPeriodLabel,
    late: row.status === "unapproved" ? "Unapproved" : row.flagged ? "Flagged" : "Pending",
    img: row.img,
    lateTone: row.status === "unapproved" ? "danger" : "warning",
  }));

  const attentionItems = buildAttentionItems({
    weekScope,
    openShifts,
    pendingTimeCount,
    pendingLeaveCount,
    highLeave: highLeave ? { n: highLeave.n, date: highLeave.date } : null,
    rotaIssueCount: input.rotaIssueCount ?? 0,
    rotaIssuesResolved: input.rotaIssuesResolved ?? false,
    hasPublishedSnapshot: input.hasPublishedSnapshot ?? false,
    hasUnpublishedChanges: input.hasUnpublishedChanges ?? false,
  });

  return { leaveItems, timesheetItems, attentionItems };
}
