import * as React from "react";
import { buildOpenRow, buildStaffRows } from "../lib/draftRota";
import { DEFAULT_ROTA_FILTERS } from "../lib/rotaFilters";
import * as liveDates from "../lib/liveRotaDates";
import {
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
import { useRotaWeekDerivedData } from "./useRotaWeekDerivedData";
import { useRotaLiveData } from "./useRotaLiveData";
import { useRotaLivePersistence } from "./useRotaLivePersistence";
import { useRotaConfirmations } from "./useRotaConfirmations";
import { useWorkspaceSelector } from "@/features/demo/store/useWorkspaceStore";

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
  const { roster, assignableStaff, sourceShifts, leaveRequests } = useRotaGridSources(
    live,
    readOnly,
    weekDraft.draftShifts,
    demoLeaveRequests,
  );
  const liveActions = live.isLive ? livePersistence : null;
  const confirmations = liveActions ? liveConfirmations : weekDraft;

  const derived = useRotaWeekDerivedData({
    isLive: live.isLive,
    weekStart: live.weekStart,
    today: live.today,
    weekOffset: weekDraft.weekOffset,
    sourceShifts,
    leaveRequests,
    roster,
    boundaryOverlaps: live.boundaryOverlaps,
  });
  const displayShifts = derived.displayShifts;
  const visibleStaff = filterStaff(roster, displayShifts, filters, staffSearch);
  const selectedShift = weekDraft.selectedShiftId
    ? (displayShifts.find((shift) => shift.id === weekDraft.selectedShiftId) ?? null)
    : null;

  // The demo store writes synchronously and never toasts per shift, so it is
  // already the "silent" form the bulk executor needs; only the live path has to
  // opt out of its per-write toast and refetch.
  const draftBulkRunners = React.useMemo(
    () => ({
      addShift: async (input: Parameters<typeof weekDraft.addShift>[0]) => {
        weekDraft.addShift(input);
      },
      updateShift: async (
        id: Parameters<typeof weekDraft.updateShift>[0],
        patch: Parameters<typeof weekDraft.updateShift>[1],
      ) => {
        weekDraft.updateShift(id, patch);
      },
      removeShift: async (id: Parameters<typeof weekDraft.removeShiftNow>[0]) => {
        weekDraft.removeShiftNow(id);
      },
      refetch: async () => {},
    }),
    // The draft store's actions are recreated each render but always write to
    // the same store; the runners only need to be stable within a bulk run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

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
    /** Toast-free sequential writes plus a single end-of-run refetch. */
    bulkRunners: liveActions?.bulkRunners ?? draftBulkRunners,
    requestRemoveShift: confirmations.requestRemoveShift,
    requestClearWeek: confirmations.requestClearWeek,
    requestCopyPreviousWeek: confirmations.requestCopyPreviousWeek,
    confirmPendingAction: confirmations.confirmPendingAction,
    clearConfirmation: confirmations.clearConfirmation,
    confirmation: confirmations.confirmation,
    days: derived.days,
    staff: roster,
    assignableStaff,
    leaveRequests,
    dayIsoDates: derived.dayIsoDates,
    roleOptions: Array.from(new Set(roster.map((row) => row.role))),
    filters,
    setFilters,
    staffSearch,
    setStaffSearch,
    draftShifts: displayShifts,
    staffRows: buildStaffRows(visibleStaff, displayShifts, leaveRequests, derived.dayIsoDates),
    openRow: buildOpenRow(displayShifts),
    visibleStaff,
    hasActiveFilters:
      staffSearch.trim().length > 0 ||
      filters.department !== "all" ||
      filters.shiftStatus !== "all" ||
      filters.warningType !== "all",
    openShiftCount: countOpenShifts(displayShifts),
    conflictCount: derived.conflictSummaries.length,
    approvedLeaveClashCount: derived.approvedLeaveConflictSummaries.length,
    overlappingShiftCount: derived.overlappingShiftCount,
    assignedShiftCount: countAssignedShifts(displayShifts),
    plannedShiftCount: countPlannedShifts(displayShifts),
    conflictSummaries: derived.conflictSummaries,
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
