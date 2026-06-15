import * as React from "react";
import { staff } from "../data/mockData";
import type { RotaFilters } from "../types";
import { buildOpenRow, buildStaffRows } from "../lib/draftRota";
import { getCurrentWeekDayIndex, getWeekDayLabels } from "../lib/weekHelpers";
import { buildLocalConflictSummaries, withLocalConflictStatus } from "../lib/localConflicts";
import {
  buildDayStats,
  buildRoleCoverage,
  countAssignedShifts,
  countOpenShifts,
  countPlannedShifts,
  coveragePercent,
  filterStaff,
  staffWeeklyHourTarget,
  totalScheduledHours,
  workingTimeAlerts,
} from "../lib/rotaSummaries";
import { useRotaWeekDrafts } from "./useRotaWeekDrafts";
import { useRotaLiveData } from "./useRotaLiveData";
import { useWorkspaceSelector } from "@/features/demo/store/useWorkspaceStore";
import type { LeaveRequest } from "@/features/leave/types";
import {
  buildApprovedLeaveConflictSummaries,
  withApprovedLeaveConflictStatus,
} from "@/features/leave/lib/leaveRotaConflicts";

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const DEFAULT_ROTA_FILTERS: RotaFilters = {
  department: "all",
  shiftStatus: "all",
  warningType: "all",
};

/** Stable empty reference: live mode has no leave wiring, so no leave conflicts. */
const NO_LEAVE_REQUESTS: LeaveRequest[] = [];

function addIsoDays(isoDate: string, days: number): Date {
  const date = new Date(`${isoDate}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date;
}

function liveWeekDayLabels(weekStart: string): string[] {
  return DAY_NAMES.map((day, index) => {
    const date = addIsoDays(weekStart, index);
    return `${day} ${date.getUTCDate()} ${MONTH_NAMES[date.getUTCMonth()]}`;
  });
}

function liveWeekLabel(weekStart: string): string {
  const start = addIsoDays(weekStart, 0);
  const end = addIsoDays(weekStart, 6);
  if (start.getUTCMonth() === end.getUTCMonth()) {
    return `${start.getUTCDate()}–${end.getUTCDate()} ${MONTH_NAMES[start.getUTCMonth()]}`;
  }
  return `${start.getUTCDate()} ${MONTH_NAMES[start.getUTCMonth()]} – ${end.getUTCDate()} ${MONTH_NAMES[end.getUTCMonth()]}`;
}

function liveCurrentDayIndex(weekStart: string, today: string): number | null {
  const start = addIsoDays(weekStart, 0).getTime();
  const current = addIsoDays(today, 0).getTime();
  const index = Math.round((current - start) / 86_400_000);
  return index >= 0 && index <= 6 ? index : null;
}

export function useRotaDraftController() {
  const weekDraft = useRotaWeekDrafts();
  const live = useRotaLiveData(weekDraft.weekOffset);
  const demoLeaveRequests = useWorkspaceSelector((state) => state.leaveRequests);
  const [filters, setFilters] = React.useState<RotaFilters>(DEFAULT_ROTA_FILTERS);
  const [staffSearch, setStaffSearch] = React.useState("");

  // Source the roster, shifts, and leave from the live workspace when a manager
  // read succeeds; otherwise stay on the demo store so Harbour View keeps working.
  // Live-capable manager sessions stay read-only even while a live read is
  // loading or has failed and the demo fallback is visible.
  const readOnly = live.enabled;
  const roster = live.isLive ? live.staff : staff;
  const sourceShifts = live.isLive ? live.shifts : weekDraft.draftShifts;
  const leaveRequests = live.isLive ? NO_LEAVE_REQUESTS : demoLeaveRequests;

  const displayShifts = React.useMemo(
    () =>
      withApprovedLeaveConflictStatus(
        withLocalConflictStatus(sourceShifts),
        leaveRequests,
        weekDraft.weekOffset,
      ),
    [leaveRequests, sourceShifts, weekDraft.weekOffset],
  );
  const dayLabels = React.useMemo(() => {
    if (live.isLive && live.weekStart) return liveWeekDayLabels(live.weekStart);
    return getWeekDayLabels(weekDraft.weekOffset);
  }, [live.isLive, live.weekStart, weekDraft.weekOffset]);
  const days = React.useMemo(() => {
    const stats = buildDayStats(displayShifts);
    const currentDayIndex =
      live.isLive && live.weekStart && live.today
        ? liveCurrentDayIndex(live.weekStart, live.today)
        : getCurrentWeekDayIndex(weekDraft.weekOffset);
    return dayLabels.map((d, index) => ({
      d,
      isToday: index === currentDayIndex,
      ...stats[index]!,
    }));
  }, [dayLabels, displayShifts, live.isLive, live.today, live.weekStart, weekDraft.weekOffset]);
  const visibleStaff = filterStaff(roster, displayShifts, filters, staffSearch);
  const conflictSummaries = [
    ...buildLocalConflictSummaries(displayShifts, roster, dayLabels),
    ...buildApprovedLeaveConflictSummaries(
      displayShifts,
      leaveRequests,
      weekDraft.weekOffset,
      roster,
      dayLabels,
    ),
  ];
  const selectedShift = weekDraft.selectedShiftId
    ? (displayShifts.find((shift) => shift.id === weekDraft.selectedShiftId) ?? null)
    : null;

  return {
    ...weekDraft,
    // Live read-only mode reflects the saved DB week; demo mode keeps draft flags.
    weekLabel: live.isLive && live.weekStart ? liveWeekLabel(live.weekStart) : weekDraft.weekLabel,
    source: live.source,
    readOnly,
    isLiveLoading: live.isLoading,
    isLiveError: live.isError,
    hasLiveWeek: live.hasWeek,
    liveWeekStart: live.weekStart,
    liveLocationId: live.locationId,
    liveLocationName: live.locationName,
    liveLocations: live.locations,
    setLiveLocationId: live.setLocationId,
    published: readOnly ? live.weekStatus === "published" : weekDraft.published,
    hasUnpublishedChanges: readOnly ? false : weekDraft.hasUnpublishedChanges,
    days,
    staff: roster,
    roleOptions: Array.from(new Set(roster.map((row) => row.role))),
    filters,
    setFilters,
    staffSearch,
    setStaffSearch,
    draftShifts: displayShifts,
    staffRows: buildStaffRows(visibleStaff, displayShifts),
    openRow: buildOpenRow(displayShifts),
    visibleStaff,
    hasActiveFilters:
      staffSearch.trim().length > 0 ||
      filters.department !== "all" ||
      filters.shiftStatus !== "all" ||
      filters.warningType !== "all",
    openShiftCount: countOpenShifts(displayShifts),
    conflictCount: conflictSummaries.length,
    assignedShiftCount: countAssignedShifts(displayShifts),
    plannedShiftCount: countPlannedShifts(displayShifts),
    conflictSummaries,
    roleCoverage: buildRoleCoverage(roster, displayShifts),
    coveragePct: coveragePercent(roster, displayShifts),
    scheduledHours: totalScheduledHours(displayShifts),
    targetHours: staffWeeklyHourTarget(roster),
    workingTimeAlertList: workingTimeAlerts(roster, displayShifts),
    selectedShift,
    clearFilters: () => {
      setStaffSearch("");
      setFilters(DEFAULT_ROTA_FILTERS);
    },
  };
}
