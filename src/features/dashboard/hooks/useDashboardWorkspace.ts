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
  const workspace = useWorkspaceSelector((state) => state);
  return React.useMemo(() => {
    const draft = workspace.weekDrafts[String(workspace.weekOffset)] ?? workspace.weekDrafts["0"]!;
    const nextDraft = workspace.weekDrafts["1"] ?? draft;
    const openShifts = countOpenShifts(nextDraft.shifts);
    const pendingTime = workspace.timeRows.filter((row) => row.status !== "approved");
    const pendingLeave = workspace.leaveRequests.filter((request) => request.state === "pending");
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
    const attentionItems: AttentionItem[] = [
      {
        t: `Next week has ${openShifts} open shift${openShifts === 1 ? "" : "s"}`,
        s: "Resolve before Fri 16:00 to publish on time",
        icon: AlertTriangle,
        tone: "warning",
      },
      {
        t: `${pendingTime.length} timesheet${pendingTime.length === 1 ? "" : "s"} need manager review`,
        s: "Export approved hours after review",
        icon: Clock3,
        tone: "danger",
      },
      {
        t: highLeave
          ? "1 leave request — high coverage impact"
          : `${pendingLeave.length} leave requests pending`,
        s: highLeave ? `${highLeave.n} · ${highLeave.date}` : "Review against the rota",
        icon: Plane,
        tone: "purple",
      },
    ];
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
    };
  }, [workspace]);
}
