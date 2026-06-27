import * as React from "react";
import { useWorkspaceSelector } from "@/features/demo/store/useWorkspaceStore";
import { staff } from "@/features/rota/data/mockData";
import {
  coveragePercent,
  countOpenShifts,
  totalScheduledHours,
} from "@/features/rota/lib/rotaSummaries";
import { kpiItems, todayKpiItems } from "../data/dashboardDemoData";
import { buildDashboardOperational } from "../lib/dashboardOperational";

/** Demo period label for the offline Harbour View timesheet rows. */
const DEMO_TIMESHEET_PERIOD = "8 – 14 Jun 2026";

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

    const { leaveItems, timesheetItems, attentionItems } = buildDashboardOperational({
      openShifts,
      // The demo store watches next week's draft (weekDrafts["1"]), so copy says "next week".
      weekScope: "next",
      pendingLeave,
      pendingTime,
      timesheetPeriodLabel: DEMO_TIMESHEET_PERIOD,
    });

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
      source: "demo" as const,
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
      attentionWeekScope: "next" as const,
    };
  }, [weekDrafts, weekOffset, leaveRequests, timeRows]);
}
