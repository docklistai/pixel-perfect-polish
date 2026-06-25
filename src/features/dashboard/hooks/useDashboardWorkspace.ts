import * as React from "react";
import { AlertTriangle, Clock3, Plane } from "lucide-react";
import { useWorkspaceSelector } from "@/features/demo/store/useWorkspaceStore";
import { staff } from "@/features/rota/data/mockData";
import {
  countOpenShifts,
  coveragePercent,
  totalScheduledHours,
} from "@/features/rota/lib/rotaSummaries";
import { kpiItems, todayKpiItems } from "../data/dashboardDemoData";
import type { AttentionItem, LeaveItem, TimesheetItem } from "../types";

export function useDashboardWorkspace() {
  const weekOffset = useWorkspaceSelector((state) => state.weekOffset);
  const weekDrafts = useWorkspaceSelector((state) => state.weekDrafts);
  const leaveRequests = useWorkspaceSelector((state) => state.leaveRequests);
  const timeRows = useWorkspaceSelector((state) => state.timeRows);
  return React.useMemo(() => {
    const draft = weekDrafts[String(weekOffset)] ?? weekDrafts["0"]!;
    const nextDraft = weekDrafts["1"] ?? draft;
    const openShifts = countOpenShifts(nextDraft.shifts);
    const pendingTime = timeRows.filter((row) => row.status !== "approved");
    const pendingLeave = leaveRequests.filter((request) => request.state === "pending");
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
      d: "8 – 14 Jun 2026",
      late: row.status === "unapproved" ? "Unapproved" : row.flagged ? "Flagged" : "Pending",
      img: row.img,
      lateTone: row.status === "unapproved" ? "danger" : "warning",
    }));
    const openShiftDetail =
      openShifts === 0
        ? "Next week's draft has no open shifts. You're clear to publish."
        : `Next week's draft has ${openShifts} unassigned shift${openShifts === 1 ? "" : "s"}. Open the rota to assign cover before the publish deadline.`;
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
            t: `Next week has ${openShifts} open shift${openShifts === 1 ? "" : "s"}`,
            s: "Resolve before Fri 16:00 to publish on time",
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
    const weeklyKpis = kpiItems.map((item) =>
      item.label === "Scheduled hours"
        ? { ...item, value: `${Math.round(totalScheduledHours(draft.shifts))}h` }
        : item.label === "Coverage"
          ? { ...item, value: `${coveragePercent(staff, draft.shifts)}%` }
          : item,
    );
    const onShiftToday =
      draft.publishedSnapshot?.shifts.filter(
        (shift) => shift.dayIndex === 3 && shift.staffId !== null,
      ).length ?? 0;
    const todayKpis = todayKpiItems.map((item) =>
      item.label === "On shift today" ? { ...item, value: String(onShiftToday) } : item,
    );
    return {
      openShifts,
      pendingTime,
      pendingLeave,
      leaveItems,
      timesheetItems,
      attentionItems,
      weeklyKpis,
      todayKpis,
      nextPublished: nextDraft.published,
      nextHasUnpublishedChanges: nextDraft.hasUnpublishedChanges,
    };
  }, [weekDrafts, weekOffset, leaveRequests, timeRows]);
}
