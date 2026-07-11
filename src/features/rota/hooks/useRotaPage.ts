import * as React from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useIntentHandler } from "@/lib/interactionIntents";
import { useOverlays } from "@/components/AppShortcuts";
import { useRotaDraftController } from "./useRotaDraftController";
import { useRotaShiftActions } from "./useRotaShiftActions";
import { useGuardedRotaController } from "./useGuardedRotaController";
import { useRotaHistory } from "./useRotaHistory";
import { useRotaOverlays, type RotaOverlayKey } from "./useRotaOverlays";
import { useRotaPublishIntent } from "./useRotaPublishIntent";
import { useRecurringDayOffClashes } from "./useRecurringDayOffClashes";
import { useRoleColours } from "@/features/settings/hooks/useRoleColours";
import { buildRoleColourKey } from "../lib/deptColours";
import {
  getPublishState,
  getRotaHeaderStatus,
  getRotaPublishEligibility,
} from "../lib/publishEligibility";
import type { ShiftId } from "../types";

/** Drawers/dialogs that mutate the rota — blocked while viewing the live rota. */
const MUTATING_OVERLAYS = new Set<RotaOverlayKey>(["addShift", "publish", "generate"]);
const LIVE_UNSUPPORTED_OVERLAYS = new Set<RotaOverlayKey>();

/**
 * Orchestrates the /rota route: the draft controller, shift actions, overlays,
 * publish flow, and every derived value the page JSX renders. Extracted so the
 * route file stays a thin layout shell.
 */
export function useRotaPage(week: number | undefined) {
  const rota = useRotaDraftController();
  const history = useRotaHistory(rota);
  const navigate = useNavigate();

  // Apply a `?week=` deep-link once per distinct value (client-only).
  const setWeekOffset = rota.setWeekOffset;
  const appliedWeekRef = React.useRef<number | null>(null);
  React.useEffect(() => {
    if (week === undefined || appliedWeekRef.current === week) return;
    appliedWeekRef.current = week;
    setWeekOffset(week);
  }, [week, setWeekOffset]);

  const { openAiDrawer } = useOverlays();
  const overlays = useRotaOverlays();
  const actions = useRotaShiftActions(history.controller);
  const [showInsights, setShowInsights] = React.useState(true);
  const [recoverySelection, setRecoverySelection] = React.useState<{
    shiftId: ShiftId;
    staffId: string;
  } | null>(null);

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

  const dayOffClashes = useRecurringDayOffClashes({
    source: rota.source,
    draftShifts: rota.draftShifts,
    dayIsoDates: rota.dayIsoDates,
    staff: rota.staff,
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
    dayOffClashes.length;
  const publishState = getPublishState({
    published: rota.published,
    hasUnpublishedChanges: rota.hasUnpublishedChanges,
    hasReadinessIssues: readinessIssueCount > 0,
  });

  const handlePublish = async (prepareStaffUpdate: boolean) => {
    if (!publishEligibility.canPublish) {
      toast.info("Publish unavailable", {
        description: publishEligibility.blockedReason ?? "Publishing is unavailable.",
      });
      return;
    }
    try {
      await rota.handlePublish();
      overlays.setOverlay("publish", false);
      toast.success("Rota published", {
        description: prepareStaffUpdate
          ? "Published snapshot ready. Staff-app update prepared for review."
          : "Staff see the published snapshot the next time they open the app.",
        action: { label: "Open staff view", onClick: () => navigate({ to: "/portal" }) },
      });
    } catch (error) {
      if (rota.source !== "live") {
        toast.error("Rota not published", {
          description: error instanceof Error ? error.message : "The rota could not be published.",
        });
      }
    }
  };

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
    dayOffClashes,
    workingTimeAlertCount,
    leaveDataState,
    publishState,
    headerStatusTone: headerStatus.tone,
    headerStatusLabel: headerStatus.label,
    handlePublish,
    handleChooseRecoveryCandidate,
    recoverySelection,
    setRecoverySelection,
    showInsights,
    setShowInsights,
    history,
  };
}
