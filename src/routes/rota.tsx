import { createFileRoute, useNavigate } from "@tanstack/react-router";
import * as React from "react";
import { toast } from "sonner";
import { AppShell, Card, FeedbackBanner } from "@/components/dl";
import { useRotaDraftController } from "@/features/rota/hooks/useRotaDraftController";
import { useRotaShiftActions } from "@/features/rota/hooks/useRotaShiftActions";
import { useIntentHandler } from "@/lib/interactionIntents";
import { useOverlays } from "@/components/AppShortcuts";
import { Eye, EyeOff } from "lucide-react";

import { RotaPageHeader } from "@/features/rota/components/RotaPageHeader";

import { RotaGridToolbar } from "@/features/rota/components/RotaGridToolbar";
import { RotaGrid } from "@/features/rota/components/RotaGrid";
import { RotaGridLegendBar } from "@/features/rota/components/RotaGridLegendBar";
import { RotaLeaveDataWarning } from "@/features/rota/components/RotaLeaveDataWarning";
import { LabourSummaryCard } from "@/features/rota/components/LabourSummaryCard";
import { IssuesToResolveCard } from "@/features/rota/components/IssuesToResolveCard";
import { PublishReadinessCard } from "@/features/rota/components/PublishReadinessCard";
import { RotaOverlays } from "@/features/rota/components/RotaOverlays";
import { useRotaOverlays, type RotaOverlayKey } from "@/features/rota/hooks/useRotaOverlays";
import { useRotaPublishIntent } from "@/features/rota/hooks/useRotaPublishIntent";
import {
  getPublishState,
  getRotaPublishEligibility,
  publishStateLabel,
} from "@/features/rota/lib/publishEligibility";
import { requireManagerAccess } from "@/features/auth";

export const Route = createFileRoute("/rota")({
  beforeLoad: ({ context }) => requireManagerAccess(context.auth),
  head: () => ({ meta: [{ title: "Rota — Docklist" }] }),
  component: RotaPage,
});

const SCHEDULE_TITLE_ID = "rota-schedule-title";
const SCHEDULE_DESC_ID = "rota-schedule-desc";

/** Drawers/dialogs that mutate the rota — blocked while viewing the live rota. */
const MUTATING_OVERLAYS = new Set<RotaOverlayKey>(["addShift", "publish", "generate"]);
const LIVE_UNSUPPORTED_OVERLAYS = new Set<RotaOverlayKey>(["generate"]);

type RotaController = ReturnType<typeof useRotaDraftController>;

function RotaPage() {
  const rota = useRotaDraftController();
  const navigate = useNavigate();
  const { openAiDrawer } = useOverlays();
  const overlays = useRotaOverlays();
  const actions = useRotaShiftActions(rota);
  const [showInsights, setShowInsights] = React.useState(true);
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

  const workingTimeAlertCount = rota.workingTimeAlertList.length;
  const readinessIssueCount = rota.openShiftCount + rota.conflictCount + workingTimeAlertCount;
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
  const guardedRota = React.useMemo<RotaController>(() => {
    if (!readOnly) return rota;
    const blocked = () => actions.block();
    const blockedAsync = async () => actions.block();
    return {
      ...rota,
      confirmation: null,
      addShift: blocked,
      duplicateShiftAsOpen: blocked,
      duplicateShiftToNextDay: () => {
        actions.block();
        return null;
      },
      removeShiftNow: blocked,
      restoreShift: blocked,
      updateShift: blocked,
      copyPreviousWeek: blocked,
      applyOpenShiftSuggestions: () => {
        actions.block();
        return [];
      },
      handlePublish: blocked,
      requestRemoveShift: blocked,
      requestClearWeek: blocked,
      confirmPendingAction: blockedAsync,
      markShiftOpen: blocked,
    };
  }, [readOnly, rota, actions]);

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
                ? "The live rota couldn't be loaded. A sample rota is shown as a read-only fallback."
                : rota.isLiveLoading
                  ? "Loading your workspace rota. A sample rota is shown as a read-only fallback."
                  : rota.hasLiveWeek
                    ? "You're viewing your workspace's saved rota. Editing and publishing aren't available in live mode yet."
                    : "No saved rota for this week yet. Editing and publishing aren't available in live mode yet."
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

          {showInsights ? (
            <div className="space-y-3">
              <div className="flex justify-end xl:hidden mb-[-4px]">
                <button
                  type="button"
                  onClick={() => setShowInsights(false)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  <EyeOff className="h-3.5 w-3.5" aria-hidden />
                  Hide insights
                </button>
              </div>
              <div className="hidden xl:flex justify-end mb-[-4px]">
                <button
                  type="button"
                  onClick={() => setShowInsights(false)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  <EyeOff className="h-3.5 w-3.5" aria-hidden />
                  Hide insights
                </button>
              </div>
              <LabourSummaryCard
                scheduledHours={rota.scheduledHours}
                targetHours={rota.targetHours}
                coveragePct={rota.coveragePct}
                onViewCoverageDetails={() => openOverlay("coverageDetails")}
              />
              <IssuesToResolveCard
                conflicts={rota.conflictSummaries}
                workingTimeAlerts={rota.workingTimeAlertList}
                onReviewShift={rota.setSelectedShiftId}
                onOpenSupport={openAiDrawer}
              />
              <PublishReadinessCard
                published={rota.published}
                hasUnpublishedChanges={rota.hasUnpublishedChanges}
                publishState={publishState}
                conflictCount={rota.conflictCount}
                openShiftCount={rota.openShiftCount}
                workingTimeAlertCount={workingTimeAlertCount}
                assignedShiftCount={rota.assignedShiftCount}
                plannedShiftCount={rota.plannedShiftCount}
                coveragePct={rota.coveragePct}
                readOnly={readOnly || rota.liveMutationPending || rota.liveMutationFailed}
                canPublish={publishEligibility.canPublish}
                onPublish={requestPublish}
              />
            </div>
          ) : (
            <div className="flex justify-center xl:justify-end">
              <button
                type="button"
                onClick={() => setShowInsights(true)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                <Eye className="h-3.5 w-3.5" aria-hidden />
                Show insights
              </button>
            </div>
          )}
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
      />
    </AppShell>
  );
}
