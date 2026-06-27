import { AlertTriangle, Clock3, Plane } from "lucide-react";
import type { LeaveRequest } from "@/features/leave/types";
import type { StoredTimesheetRow } from "@/features/time/types";
import type { AttentionItem, LeaveItem, TimesheetItem } from "../types";

/**
 * Pure derivation of the Dashboard's operational surfaces from already-pending
 * inputs. Shared by the demo store hook and the live workspace hook so both
 * paths produce identical attention/leave/timesheet output — the only
 * difference between demo and live is where the inputs come from, never how
 * they are presented. Kept free of React/Supabase so the rules are unit-tested.
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

/** Manager-support card title with correct singular/plural for the active count. */
export function dashboardAttentionTitle(activeCategories: number): string {
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
  return `${weekScopePossessive(weekScope)} draft has ${openShifts} open shifts. ${pendingTime} timesheets need manager review and ${pendingLeave} leave requests are pending.`;
}

export interface DashboardOperationalInput {
  /** Unassigned shifts in the week the dashboard is watching. */
  openShifts: number;
  /** Which week the surfaced numbers describe, so copy uses the right noun. */
  weekScope: DashboardWeekScope;
  /** Leave requests already filtered to the pending state. */
  pendingLeave: LeaveRequest[];
  /** Timesheet rows already filtered to a non-approved status. */
  pendingTime: StoredTimesheetRow[];
  /**
   * Subtitle for each timesheet row. The demo passes its fixed period; live
   * passes an honest period label rather than fabricating a per-row range.
   */
  timesheetPeriodLabel: string;
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
  const highLeave = pendingLeave.find((request) => request.impact === "High");

  const leaveItems: LeaveItem[] = pendingLeave.map((request) => ({
    n: request.n,
    d: `${request.date}  (${request.days} days)`,
    img: request.img,
    impact: request.impact === "Medium" ? "Moderate" : request.impact,
    impactTone: request.tone,
  }));

  const timesheetItems: TimesheetItem[] = pendingTime.map((row) => ({
    n: row.n,
    d: timesheetPeriodLabel,
    late: row.status === "unapproved" ? "Unapproved" : row.flagged ? "Flagged" : "Pending",
    img: row.img,
    lateTone: row.status === "unapproved" ? "danger" : "warning",
  }));

  const openShiftDetail =
    openShifts === 0
      ? `${weekScopePossessive(weekScope)} draft has no open shifts. You're clear to publish.`
      : `${weekScopePossessive(weekScope)} draft has ${openShifts} unassigned shift${openShifts === 1 ? "" : "s"}. Open the rota to assign cover before you publish.`;
  const timeDetail =
    pendingTime.length === 0
      ? "No timesheets are waiting for review."
      : `${pendingTime.length} timesheet${pendingTime.length === 1 ? "" : "s"} ${pendingTime.length === 1 ? "is" : "are"} waiting for manager review. Approve or query each before exporting hours.`;
  const leaveDetail = highLeave
    ? `${highLeave.n}'s request (${highLeave.date}) needs a decision and may affect coverage. Review it against the rota.`
    : pendingLeave.length === 0
      ? "No leave requests are pending."
      : `${pendingLeave.length} leave request${pendingLeave.length === 1 ? "" : "s"} pending. Review each against the rota.`;

  // Only surface categories with a real active issue, so the Attention count
  // reflects what actually needs the manager — never a fixed list of three.
  const attentionCandidates: (AttentionItem | null)[] = [
    openShifts > 0
      ? {
          t: `${weekScopeHeading(weekScope)} has ${openShifts} open shift${openShifts === 1 ? "" : "s"}`,
          s: "Resolve open shifts before publishing",
          icon: AlertTriangle,
          tone: "warning" as const,
          route: "/rota" as const,
          cta: "Open rota",
          tag: "Action needed",
          detail: openShiftDetail,
        }
      : null,
    pendingTime.length > 0
      ? {
          t: `${pendingTime.length} timesheet${pendingTime.length === 1 ? "" : "s"} need manager review`,
          s: "Export approved hours after review",
          icon: Clock3,
          tone: "danger" as const,
          route: "/time" as const,
          cta: "Review timesheets",
          tag: "Needs review",
          detail: timeDetail,
        }
      : null,
    pendingLeave.length > 0
      ? {
          t: highLeave
            ? "1 leave request — high coverage impact"
            : `${pendingLeave.length} leave request${pendingLeave.length === 1 ? "" : "s"} pending`,
          s: highLeave ? `${highLeave.n} · ${highLeave.date}` : "Review against the rota",
          icon: Plane,
          tone: "purple" as const,
          route: "/leave" as const,
          cta: "Review leave",
          tag: "Decision needed",
          detail: leaveDetail,
        }
      : null,
  ];
  const attentionItems: AttentionItem[] = attentionCandidates.filter(
    (item): item is AttentionItem => item !== null,
  );

  return { leaveItems, timesheetItems, attentionItems };
}
