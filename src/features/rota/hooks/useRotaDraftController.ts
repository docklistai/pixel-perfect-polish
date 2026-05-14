import * as React from "react";
import { staff } from "../data/mockData";
import type { RotaFilters, RotaViewMode } from "../types";
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
  totalScheduledHours,
  workingTimeAlerts,
} from "../lib/rotaSummaries";
import { useRotaWeekDrafts } from "./useRotaWeekDrafts";

const DEFAULT_ROTA_FILTERS: RotaFilters = {
  department: "all",
  shiftStatus: "all",
  warningType: "all",
};

export function useRotaDraftController() {
  const weekDraft = useRotaWeekDrafts();
  const [filters, setFilters] = React.useState<RotaFilters>(DEFAULT_ROTA_FILTERS);
  const [staffSearch, setStaffSearch] = React.useState("");
  const [viewMode, setViewMode] = React.useState<RotaViewMode>("employee");

  const displayShifts = React.useMemo(
    () => withLocalConflictStatus(weekDraft.draftShifts),
    [weekDraft.draftShifts],
  );
  const dayLabels = React.useMemo(
    () => getWeekDayLabels(weekDraft.weekOffset),
    [weekDraft.weekOffset],
  );
  const days = React.useMemo(() => {
    const stats = buildDayStats(displayShifts);
    const currentDayIndex = getCurrentWeekDayIndex(weekDraft.weekOffset);
    return dayLabels.map((d, index) => ({
      d,
      isToday: index === currentDayIndex,
      ...stats[index]!,
    }));
  }, [dayLabels, displayShifts, weekDraft.weekOffset]);
  const visibleStaff = filterStaff(staff, displayShifts, filters, staffSearch);
  const conflictSummaries = buildLocalConflictSummaries(displayShifts, staff, dayLabels);
  const selectedShift = weekDraft.selectedShiftId
    ? (displayShifts.find((shift) => shift.id === weekDraft.selectedShiftId) ?? null)
    : null;

  return {
    ...weekDraft,
    days,
    staff,
    roleOptions: Array.from(new Set(staff.map((row) => row.role))),
    filters,
    setFilters,
    staffSearch,
    setStaffSearch,
    viewMode,
    setViewMode,
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
    roleCoverage: buildRoleCoverage(staff, displayShifts),
    coveragePct: coveragePercent(staff, displayShifts),
    scheduledHours: totalScheduledHours(displayShifts),
    workingTimeAlertList: workingTimeAlerts(staff, displayShifts),
    selectedShift,
    clearFilters: () => {
      setStaffSearch("");
      setFilters(DEFAULT_ROTA_FILTERS);
    },
  };
}
