import * as React from "react";
import { useNavigate } from "@tanstack/react-router";
import { useIntentHandler } from "@/lib/interactionIntents";
import { useOverlays } from "@/components/AppShortcuts";
import { useRotaDraftController } from "./useRotaDraftController";
import { useRotaShiftActions } from "./useRotaShiftActions";
import { useGuardedRotaController } from "./useGuardedRotaController";
import { useRotaHistory } from "./useRotaHistory";
import { useRotaLocationSelection, useRotaWeekSearch } from "./useRotaLocationSelection";
import { useRotaOverlays, type RotaOverlayKey } from "./useRotaOverlays";
import { useRotaPublishIntent } from "./useRotaPublishIntent";
import { useRotaPublishAction } from "./useRotaPublishAction";
import { useAvailabilityConstraints } from "./useAvailabilityConstraints";
import { useRoleColours } from "@/features/settings/hooks/useRoleColours";
import { buildRoleColourKey } from "../lib/deptColours";
import {
  getPublishState,
  getRotaHeaderStatus,
  getRotaPublishEligibility,
} from "../lib/publishEligibility";
import type { ShiftId } from "../types";
import { LIVE_UNSUPPORTED_OVERLAYS, MUTATING_OVERLAYS } from "../lib/rotaOverlayGuards";

export function useRotaPage(week: number | undefined, location: string | undefined) {
  const rota = useRotaDraftController(location ?? null);
  const history = useRotaHistory(rota);
  const navigate = useNavigate();

  useRotaWeekSearch(week, rota.setWeekOffset);

  const liveLocationId = rota.source === "live" ? rota.liveLocationId : null;
  const { openAiDrawer } = useOverlays();
  const overlays = useRotaOverlays();
  const actions = useRotaShiftActions(history.controller);
  const [showInsights, setShowInsights] = React.useState(true);
  const [recoverySelection, setRecoverySelection] = React.useState<{
    shiftId: ShiftId;
    staffId: string;
  } | null>(null);
  const handleLocationChange = useRotaLocationSelection({
    searchLocation: location,
    searchLocationIsValid: rota.liveLocations.some((option) => option.id === location),
    liveLocationId,
    hasMultipleLocations: rota.liveLocations.length > 1,
    setLiveLocationId: rota.setLiveLocationId,
    clearSelectedShift: () => rota.setSelectedShiftId(null),
    clearRecovery: () => setRecoverySelection(null),
    clearFillSummary: () => actions.setFillSummary(null),
    clearConfirmation: rota.clearConfirmation,
    closeOverlays: overlays.closeAll,
  });

  const readOnly = rota.readOnly;
  const isLiveEditing = rota.source === "live" && !readOnly;
  const publishEligibility = getRotaPublishEligibility({
    readOnly,
    mutationPending: rota.liveMutationPending,
    mutationFailed: rota.liveMutationFailed,
    plannedShiftCount: rota.plannedShiftCount,
    weekStatus: rota.liveWeekStatus,
    published: rota.published,
    hasUnpublishedChanges: rota.hasUnpublishedChanges,
  });

  const openOverlay = React.useCallback(
    (key: RotaOverlayKey) => {
      if (readOnly && MUTATING_OVERLAYS.has(key)) return actions.block();
      if (isLiveEditing && LIVE_UNSUPPORTED_OVERLAYS.has(key)) return actions.blockDraftOnly();
      overlays.openOverlay(key);
    },
    [isLiveEditing, readOnly, actions, overlays],
  );

  const requestPublish = useRotaPublishIntent({
    isLoading: rota.isLiveLoading,
    eligibility: publishEligibility,
    openOverlay,
  }).requestPublish;

  useIntentHandler("rota.publish", requestPublish);
  useIntentHandler("rota.generate", () => openOverlay("generate"));
  useIntentHandler("rota.addShift", () => openOverlay("addShift"));

  const handleChooseRecoveryCandidate = React.useCallback(
    (shiftId: ShiftId, staffId: string) => {
      setRecoverySelection({ shiftId, staffId });
      rota.setSelectedShiftId(shiftId);
    },
    [rota],
  );

  const roleColoursConfig = useRoleColours().configMap;
  const roleColours = React.useMemo(
    () =>
      buildRoleColourKey(
        rota.draftShifts.map((s) => s.deptOverride ?? s.role),
        roleColoursConfig,
      ),
    [rota.draftShifts, roleColoursConfig],
  );

  const availability = useAvailabilityConstraints({
    source: rota.source,
    draftShifts: rota.draftShifts,
    dayIsoDates: rota.dayIsoDates,
    staff: rota.staff,
    staffRows: rota.staffRows,
  });

  const workingTimeAlertCount = rota.workingTimeAlertList.length;
  const leaveDataState: "ready" | "loading" | "error" =
    rota.source !== "live"
      ? "ready"
      : rota.isLiveLeaveLoading
        ? "loading"
        : rota.isLiveLeaveError
          ? "error"
          : "ready";
  const readinessIssueCount =
    rota.openShiftCount +
    rota.conflictCount +
    workingTimeAlertCount +
    (leaveDataState === "ready" ? 0 : 1) +
    availability.clashes.length +
    (availability.dataState === "ready" ? 0 : 1);
  const publishState = getPublishState({
    published: rota.published,
    hasUnpublishedChanges: rota.hasUnpublishedChanges,
    hasReadinessIssues: readinessIssueCount > 0,
  });

  const handlePublish = useRotaPublishAction({
    eligibility: publishEligibility,
    source: rota.source,
    publish: rota.handlePublish,
    closeDialog: () => overlays.setOverlay("publish", false),
    openStaffView: () => navigate({ to: "/portal" }),
  });

  const guardedRota = useGuardedRotaController(history.controller, readOnly, actions.block);

  const headerStatus = getRotaHeaderStatus({
    readOnly,
    isLive: rota.source === "live",
    isLiveError: rota.isLiveError,
    isLiveLoading: rota.isLiveLoading,
    hasLiveWeek: rota.hasLiveWeek,
    publishState,
  });

  return {
    rota,
    actions,
    overlays,
    guardedRota,
    readOnly,
    openOverlay,
    openAiDrawer,
    requestPublish,
    publishEligibility,
    roleColours,
    roleColoursConfig,
    availability,
    workingTimeAlertCount,
    leaveDataState,
    publishState,
    headerStatusTone: headerStatus.tone,
    headerStatusLabel: headerStatus.label,
    handlePublish,
    handleLocationChange,
    handleChooseRecoveryCandidate,
    recoverySelection,
    setRecoverySelection,
    showInsights,
    setShowInsights,
    history,
  };
}
