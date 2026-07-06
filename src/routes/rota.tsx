import { createFileRoute, useNavigate } from "@tanstack/react-router";
import * as React from "react";
import { toast } from "sonner";
import { AppShell, Card, FeedbackBanner } from "@/components/dl";
import { useRotaDraftController } from "@/features/rota/hooks/useRotaDraftController";
import { useRotaShiftActions } from "@/features/rota/hooks/useRotaShiftActions";
import { useGuardedRotaController } from "@/features/rota/hooks/useGuardedRotaController";
import { useIntentHandler } from "@/lib/interactionIntents";
import { useOverlays } from "@/components/AppShortcuts";

import { RotaPageHeader } from "@/features/rota/components/RotaPageHeader";

import { RotaGridToolbar } from "@/features/rota/components/RotaGridToolbar";
import { RotaGrid } from "@/features/rota/components/RotaGrid";
import { RotaGridLegendBar } from "@/features/rota/components/RotaGridLegendBar";
import { RotaLeaveDataWarning } from "@/features/rota/components/RotaLeaveDataWarning";
import { RotaInsightsColumn } from "@/features/rota/components/RotaInsightsColumn";
import { RotaOverlays } from "@/features/rota/components/RotaOverlays";
import { useRotaOverlays, type RotaOverlayKey } from "@/features/rota/hooks/useRotaOverlays";
import { useRotaPublishIntent } from "@/features/rota/hooks/useRotaPublishIntent";
import {
  getPublishState,
  getRotaPublishEligibility,
  publishStateLabel,
} from "@/features/rota/lib/publishEligibility";
import { requireManagerAccess } from "@/features/auth";
import { parseRotaWeekSearch } from "@/features/rota/lib/rotaSearch";
import type { ShiftId } from "@/features/rota/types";

export const Route = createFileRoute("/rota")({
  beforeLoad: ({ context }) => requireManagerAccess(context.auth),
  validateSearch: parseRotaWeekSearch,
  head: () => ({ meta: [{ title: "Rota — Docklist" }] }),
  component: RotaPage,
});

const SCHEDULE_TITLE_ID = "rota-schedule-title";
const SCHEDULE_DESC_ID = "rota-schedule-desc";

/** Drawers/dialogs that mutate the rota — blocked while viewing the live rota. */
const MUTATING_OVERLAYS = new Set<RotaOverlayKey>(["addShift", "publish", "generate"]);
const LIVE_UNSUPPORTED_OVERLAYS = new Set<RotaOverlayKey>();

function RotaPage() {
  const rota = useRotaDraftController();
  const navigate = useNavigate();
  const { week } = Route.useSearch();

  // Apply a `?week=` deep-link once per distinct value (client-only, so it
  // never causes a hydration mismatch). Manual week navigation afterwards is
  // left untouched because it changes the store, not the search param.
  const setWeekOffset = rota.setWeekOffset;
  const appliedWeekRef = React.useRef<number | null>(null);
  React.useEffect(() => {
    if (week === undefined || appliedWeekRef.current === week) return;
    appliedWeekRef.current = week;
    setWeekOffset(week);
  }, [week, setWeekOffset]);
  const { openAiDrawer } = useOverlays();
  const overlays = useRotaOverlays();
  const actions = useRotaShiftActions(rota);
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

  // Loading/error fallback blocks mutations; successful live reads allow only
  // actions wired to persisted shift rows.
  const openOverlay = React.useCallback(
    (key: RotaOverlayKey) => {
      if (readOnly && MUTATING_OVERLAYS.has(key)) {
        actions.block();
        return;
      }
      if (isLiveEditing && LIVE_UNSUPPORTED_OVERLAYS.has(key)) {
        actions.blockDraftOnly();
        return;
      }
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

  const workingTimeAlertCount = rota.workingTimeAlertList.length;
  const leaveDataState =
    rota.source !== "live"
      ? "ready"
      : rota.isLiveLeaveLoading
        ? "loading"
        : rota.isLiveLeaveError
          ? "error"
          : "ready";
  const leaveDataIssueCount = leaveDataState === "ready" ? 0 : 1;
  const readinessIssueCount =
    rota.openShiftCount + rota.conflictCount + workingTimeAlertCount + leaveDataIssueCount;
  const hasReadinessIssues = readinessIssueCount > 0;
  const publishState = getPublishState({
    published: rota.published,
    hasUnpublishedChanges: rota.hasUnpublishedChanges,
    hasReadinessIssues,
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
        action: {
          label: "Open staff view",
          onClick: () => navigate({ to: "/portal" }),
        },
      });
    } catch (error) {
      if (rota.source !== "live") {
        toast.error("Rota not published", {
          description: error instanceof Error ? error.message : "The rota could not be published.",
        });
      }
    }
  };

  // Block every direct controller mutation in live mode so an edit from a drawer
  // or the grid can never write to the demo store while live data is on screen.
  const guardedRota = useGuardedRotaController(rota, readOnly, actions.block);

  const headerStatusTone =
    readOnly && rota.source !== "live"
      ? "warning"
      : publishState === "published" || publishState === "ready"
        ? "success"
        : "warning";
  const headerStatusLabel = rota.isLiveError
    ? "Live unavailable"
    : rota.isLiveLoading
      ? "Loading live rota"
      : rota.source === "live" && !rota.hasLiveWeek
        ? "No saved rota"
        : publishStateLabel(publishState);

  return (
    <AppShell topbarWeekLabel={rota.weekLabel}>
      <div className="w-full max-w-full overflow-x-hidden">
        {readOnly && (
          <FeedbackBanner
            tone="info"
            title="Live rota — read-only"
            description={
              rota.isLiveError
                ? "The live rota couldn't be loaded. A read-only fallback is shown."
                : rota.isLiveLoading
                  ? "Loading your workspace rota. A read-only fallback is shown until the live draft is ready."
                  : rota.hasLiveWeek
                    ? "The live rota has not loaded yet. A read-only fallback is shown."
                    : "No live rota for this week is available yet. A read-only fallback is shown."
            }
            className="mb-4"
          />
        )}
        {rota.source === "live" && (
          <RotaLeaveDataWarning
            isLoading={rota.isLiveLeaveLoading}
            isError={rota.isLiveLeaveError}
          />
        )}

        <RotaPageHeader
          weekLabel={rota.weekLabel}
          locationName={
            rota.source === "live" && rota.liveLocationName
              ? rota.liveLocationName
              : "Your workspace"
          }
          staffCount={rota.staff.length}
          statusTone={headerStatusTone}
          statusLabel={headerStatusLabel}
          canPublish={publishEligibility.canPublish}
          onPrintRota={() => window.print()}
          onClearWeek={guardedRota.requestClearWeek}
          onPublish={requestPublish}
        />

        {actions.fillSummary && (
          <FeedbackBanner
            tone="info"
            title="Open shifts updated"
            description={actions.fillSummary}
            className="mb-4"
            onDismiss={() => actions.setFillSummary(null)}
          />
        )}

        <div
          className={`grid min-w-0 grid-cols-1 gap-4 overflow-x-hidden ${showInsights ? "xl:grid-cols-[minmax(0,1fr)_300px]" : "xl:grid-cols-1"}`}
        >
          <Card className="min-w-0 overflow-hidden p-0">
            <RotaGridToolbar
              conflictCount={rota.conflictCount}
              openShiftCount={rota.openShiftCount}
              workingTimeAlertCount={workingTimeAlertCount}
              coveragePct={rota.coveragePct}
              onFilter={() => openOverlay("filters")}
              onGenerateRota={() => openOverlay("generate")}
              onAddShift={() => openOverlay("addShift")}
              onViewConflicts={() => openOverlay("conflicts")}
              onViewWorkingTime={() => openOverlay("workingTime")}
              onCopyLastWeek={actions.handleCopyLastWeek}
            />
            <RotaGrid
              days={rota.days}
              staffRows={rota.staffRows}
              openRow={rota.openRow}
              staffCount={rota.staff.length}
              visibleStaffCount={rota.visibleStaff.length}
              weekLabel={rota.weekLabel}
              staffSearch={rota.staffSearch}
              hasActiveFilters={rota.hasActiveFilters}
              scheduleTitleId={SCHEDULE_TITLE_ID}
              scheduleDescId={SCHEDULE_DESC_ID}
              onStaffSearchChange={rota.setStaffSearch}
              onClearFilters={rota.clearFilters}
              readOnly={readOnly}
              serverBacked={rota.source === "live"}
              canCopyShiftAssignment={actions.canCopyShiftAssignment}
              onReadOnlyAttempt={actions.block}
              onShiftOpen={rota.setSelectedShiftId}
              onShiftDuplicate={actions.handleDuplicateShift}
              onShiftRemove={guardedRota.requestRemoveShift}
              onShiftClear={actions.handleClearShift}
              onShiftMarkOpen={actions.handleMarkShiftOpen}
              onShiftSetDept={actions.handleSetShiftDept}
              onShiftSetColour={actions.handleSetShiftColour}
              onShiftResetColour={actions.handleResetShiftColour}
              onShiftAdd={guardedRota.addShift}
              onShiftUpdate={guardedRota.updateShift}
            />
            <RotaGridLegendBar staffCount={rota.visibleStaff.length} />
          </Card>

          <RotaInsightsColumn
            rota={rota}
            visible={showInsights}
            onVisibleChange={setShowInsights}
            publishState={publishState}
            leaveDataState={leaveDataState}
            readOnly={readOnly}
            canPublish={publishEligibility.canPublish}
            onPublish={requestPublish}
            onViewCoverageDetails={() => openOverlay("coverageDetails")}
            onOpenSupport={openAiDrawer}
            onChooseRecoveryCandidate={handleChooseRecoveryCandidate}
          />
        </div>
      </div>

      <RotaOverlays
        rota={guardedRota}
        overlays={overlays}
        onPublishConfirm={handlePublish}
        onApplySuggestions={actions.handleApplySuggestions}
        onMarkShiftOpen={actions.handleMarkShiftOpen}
        onRepeatShift={actions.handleRepeatShift}
        publishEligibility={publishEligibility}
        suggestedAssignTo={
          recoverySelection?.shiftId === rota.selectedShiftId ? recoverySelection.staffId : null
        }
        onClearRecoverySelection={() => setRecoverySelection(null)}
      />
    </AppShell>
  );
}
