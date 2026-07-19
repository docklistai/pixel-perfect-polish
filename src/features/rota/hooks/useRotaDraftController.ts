import * as React from "react";
import { buildOpenRow, buildStaffRows } from "../lib/draftRota";
import { DEFAULT_ROTA_FILTERS } from "../lib/rotaFilters";
import { getCurrentWeekDayIndex, getWeekDayLabels, getWeekDateIsoLabels } from "../lib/weekHelpers";
import * as liveDates from "../lib/liveRotaDates";
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
import { useRotaGridSources } from "./useRotaGridSources";
import { useRotaLiveData } from "./useRotaLiveData";
import { useRotaLivePersistence } from "./useRotaLivePersistence";
import { useRotaConfirmations } from "./useRotaConfirmations";
import { useWorkspaceSelector } from "@/features/demo/store/useWorkspaceStore";
import {
  buildApprovedLeaveConflictSummaries,
  withApprovedLeaveConflictStatus,
} from "@/features/leave/lib/leaveRotaConflicts";

export function useRotaDraftController(initialLocationId: string | null = null) {
  const weekDraft = useRotaWeekDrafts();
  const live = useRotaLiveData(weekDraft.weekOffset, initialLocationId);
  const livePersistence = useRotaLivePersistence(live, weekDraft.weekOffset);
  const demoLeaveRequests = useWorkspaceSelector((state) => state.leaveRequests);
  const [filters, setFilters] = React.useState(DEFAULT_ROTA_FILTERS);
  const [staffSearch, setStaffSearch] = React.useState("");
  const liveConfirmations = useRotaConfirmations({
    clearWeek: livePersistence.clearWeek,
    copyPreviousWeek: livePersistence.copyPreviousWeek,
    removeShiftNow: livePersistence.removeShiftNow,
  });

  const readOnly = live.enabled && !live.isLive;
  const { roster, fullRoster, assignableStaff, sourceShifts, leaveRequests } = useRotaGridSources(
    live,
    readOnly,
    weekDraft.draftShifts,
    demoLeaveRequests,
  );
  const liveActions = live.isLive ? livePersistence : null;
  const confirmations = liveActions ? liveConfirmations : weekDraft;

  const dayIsoDates = React.useMemo(() => {
    if (live.isLive && live.weekStart) {
      return Array.from({ length: 7 }, (_, i) => liveDates.addIsoDays(live.weekStart!, i));
    }
    return getWeekDateIsoLabels(weekDraft.weekOffset);
  }, [live.isLive, live.weekStart, weekDraft.weekOffset]);
  const displayShifts = React.useMemo(
    () =>
      withApprovedLeaveConflictStatus(
        withLocalConflictStatus(sourceShifts),
        leaveRequests,
        dayIsoDates,
      ),
    [dayIsoDates, leaveRequests, sourceShifts],
  );
  const dayLabels = React.useMemo(() => {
    if (live.isLive && live.weekStart) return liveDates.liveWeekDayLabels(live.weekStart);
    return getWeekDayLabels(weekDraft.weekOffset);
  }, [live.isLive, live.weekStart, weekDraft.weekOffset]);
  const days = React.useMemo(() => {
    const stats = buildDayStats(displayShifts);
    const currentDayIndex =
      live.isLive && live.weekStart && live.today
        ? liveDates.liveCurrentDayIndex(live.weekStart, live.today)
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
      dayIsoDates,
      roster,
      dayLabels,
    ),
  ];
  const selectedShift = weekDraft.selectedShiftId
    ? (displayShifts.find((shift) => shift.id === weekDraft.selectedShiftId) ?? null)
    : null;

  return {
    ...weekDraft,
    weekLabel:
      live.isLive && live.weekStart
        ? liveDates.liveWeekLabel(live.weekStart)
        : readOnly
          ? live.isError
            ? "Rota week unavailable"
            : "Loading week…"
          : weekDraft.weekLabel,
    source: live.source,
    readOnly,
    retryLive: live.retry,
    isLiveLoading: live.isLoading,
    isLiveError: live.isError,
    isLiveLeaveLoading: live.isLeaveLoading,
    isLiveLeaveError: live.isLeaveError,
    hasLiveWeek: live.hasWeek,
    liveRotaWeekId: live.rotaWeekId,
    liveWeekStart: live.weekStart,
    liveWeekStatus: live.weekStatus,
    liveLocationId: live.locationId,
    liveLocationName: live.locationName,
    liveLocations: live.locations,
    setLiveLocationId: live.setLocationId,
    liveMutationPending: livePersistence.isMutationPending,
    liveMutationFailed: livePersistence.lastMutationFailed,
    published: live.isLive ? live.hasPublishedSnapshot : weekDraft.published,
    hasUnpublishedChanges: live.isLive
      ? live.hasUnpublishedChanges
      : weekDraft.hasUnpublishedChanges,
    addShift: liveActions?.addShift ?? weekDraft.addShift,
    updateShift: liveActions?.updateShift ?? weekDraft.updateShift,
    removeShiftNow: liveActions?.removeShiftNow ?? weekDraft.removeShiftNow,
    duplicateShiftToNextDay:
      liveActions?.duplicateShiftToNextDay ?? weekDraft.duplicateShiftToNextDay,
    previewCopyPreviousWeek: liveActions?.previewCopyPreviousWeek,
    copyPreviousWeek: liveActions?.copyPreviousWeek ?? weekDraft.copyPreviousWeek,
    markShiftOpen: liveActions?.markShiftOpen ?? weekDraft.markShiftOpen,
    handlePublish: liveActions?.publish ?? weekDraft.handlePublish,
    requestRemoveShift: confirmations.requestRemoveShift,
    requestClearWeek: confirmations.requestClearWeek,
    requestCopyPreviousWeek: confirmations.requestCopyPreviousWeek,
    confirmPendingAction: confirmations.confirmPendingAction,
    clearConfirmation: confirmations.clearConfirmation,
    confirmation: confirmations.confirmation,
    days,
    staff: roster,
    assignableStaff,
    leaveRequests,
    dayIsoDates,
    roleOptions: Array.from(new Set(roster.map((row) => row.role))),
    filters,
    setFilters,
    staffSearch,
    setStaffSearch,
    draftShifts: displayShifts,
    staffRows: buildStaffRows(visibleStaff, displayShifts, leaveRequests, dayIsoDates),
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
