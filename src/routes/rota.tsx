import { createFileRoute, useNavigate } from "@tanstack/react-router";
import * as React from "react";
import { toast } from "sonner";
import { AppShell, Card, FeedbackBanner } from "@/components/dl";
import { useRotaDraftController } from "@/features/rota/hooks/useRotaDraftController";
import { useRotaShiftActions } from "@/features/rota/hooks/useRotaShiftActions";
import { useIntentHandler } from "@/lib/interactionIntents";
import { useOverlays } from "@/components/AppShortcuts";

import { RotaPageHeader } from "@/features/rota/components/RotaPageHeader";
import { RotaStatusBanner } from "@/features/rota/components/RotaStatusBanner";
import { RotaGridToolbar } from "@/features/rota/components/RotaGridToolbar";
import { RotaGrid } from "@/features/rota/components/RotaGrid";
import { RotaGridLegendBar } from "@/features/rota/components/RotaGridLegendBar";
import { LabourSummaryCard } from "@/features/rota/components/LabourSummaryCard";
import { IssuesToResolveCard } from "@/features/rota/components/IssuesToResolveCard";
import { PublishReadinessCard } from "@/features/rota/components/PublishReadinessCard";
import { RoleCoverageCard } from "@/features/rota/components/RoleCoverageCard";
import { LegendCard } from "@/features/rota/components/LegendCard";
import { RotaOverlays } from "@/features/rota/components/RotaOverlays";
import { useRotaOverlays, type RotaOverlayKey } from "@/features/rota/hooks/useRotaOverlays";
import { requireManagerAccess } from "@/features/auth";

export const Route = createFileRoute("/rota")({
  beforeLoad: ({ context }) => requireManagerAccess(context.auth),
  head: () => ({ meta: [{ title: "Rota — Docklist" }] }),
  component: RotaPage,
});

const SCHEDULE_TITLE_ID = "rota-schedule-title";
const SCHEDULE_DESC_ID = "rota-schedule-desc";

/** Drawers/dialogs that mutate the rota — blocked while viewing the live rota. */
const MUTATING_OVERLAYS = new Set<RotaOverlayKey>(["addShift", "publish", "generate", "templates"]);
const LIVE_UNSUPPORTED_OVERLAYS = new Set<RotaOverlayKey>(["generate", "templates"]);

type PublishState = "draft" | "unpublished-changes" | "ready" | "published" | "published-issues";
type RotaController = ReturnType<typeof useRotaDraftController>;

function publishStateLabel(state: PublishState): string {
  switch (state) {
    case "draft":
      return "Draft";
    case "unpublished-changes":
      return "Unpublished changes";
    case "ready":
      return "Ready to publish";
    case "published":
      return "Published";
    case "published-issues":
      return "Published with issues";
  }
}

function RotaPage() {
  const rota = useRotaDraftController();
  const navigate = useNavigate();
  const { openAiDrawer } = useOverlays();
  const overlays = useRotaOverlays();
  const actions = useRotaShiftActions(rota);
  const readOnly = rota.readOnly;
  const isLiveEditing = rota.source === "live" && !readOnly;
  const canPublish =
    !readOnly &&
    !rota.liveMutationPending &&
    !rota.liveMutationFailed &&
    rota.plannedShiftCount > 0 &&
    rota.liveWeekStatus !== "archived" &&
    (!rota.published || rota.hasUnpublishedChanges);

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

  useIntentHandler("rota.publish", () => openOverlay("publish"));
  useIntentHandler("rota.generate", () => openOverlay("generate"));
  useIntentHandler("rota.addShift", () => openOverlay("addShift"));

  const workingTimeAlertCount = rota.workingTimeAlertList.length;
  const readinessIssueCount = rota.openShiftCount + rota.conflictCount + workingTimeAlertCount;
  const hasReadinessIssues = readinessIssueCount > 0;
  const publishState: PublishState = rota.published
    ? rota.hasUnpublishedChanges
      ? "unpublished-changes"
      : hasReadinessIssues
        ? "published-issues"
        : "published"
    : hasReadinessIssues
      ? "draft"
      : "ready";

  const handlePublish = async (prepareStaffUpdate: boolean) => {
    if (readOnly) {
      actions.block();
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
          label: "Preview staff app",
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
      requestApplyStandardTemplate: blocked,
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
    <AppShell>
      <div className="w-full max-w-full overflow-x-hidden">
        {readOnly && (
          <FeedbackBanner
            tone="info"
            title="Live rota — read-only"
            description={
              rota.isLiveError
                ? "The live rota couldn't be loaded. Harbour View demo data is shown as a read-only fallback."
                : rota.isLiveLoading
                  ? "Loading your workspace rota. Harbour View demo data is shown as a read-only fallback."
                  : rota.hasLiveWeek
                    ? "You're viewing your workspace's saved rota. Editing and publishing aren't available in live mode yet."
                    : "No saved rota for this week yet. Editing and publishing aren't available in live mode yet."
            }
            className="mb-4"
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
          canPublish={canPublish}
          onTemplates={() => openOverlay("templates")}
          onPrintRota={() => window.print()}
          onClearWeek={guardedRota.requestClearWeek}
          onCopyLastWeek={actions.handleCopyLastWeek}
          onGenerateRota={() => openOverlay("generate")}
          onOpenSupport={openAiDrawer}
          onPublish={() => openOverlay("publish")}
        />

        <RotaStatusBanner
          published={rota.published}
          hasUnpublishedChanges={rota.hasUnpublishedChanges}
          publishState={publishState}
          openShiftCount={rota.openShiftCount}
          conflictCount={rota.conflictCount}
          workingTimeAlertCount={workingTimeAlertCount}
          coveragePct={rota.coveragePct}
          plannedShiftCount={rota.plannedShiftCount}
          weekLabel={rota.weekLabel}
          staff={rota.staff}
          readOnly={readOnly || rota.liveMutationPending || rota.liveMutationFailed}
          onPublish={() => openOverlay("publish")}
          onCopyLastWeek={actions.handleCopyLastWeek}
          onViewConflicts={() => openOverlay("conflicts")}
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

        <div className="grid min-w-0 grid-cols-1 gap-4 overflow-x-hidden xl:grid-cols-[minmax(0,1fr)_300px]">
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

          <div className="space-y-3">
            <LabourSummaryCard
              scheduledHours={rota.scheduledHours}
              targetHours={rota.targetHours}
              coveragePct={rota.coveragePct}
              onViewCoverageDetails={() => openOverlay("coverageDetails")}
            />
            <LegendCard shifts={rota.draftShifts} />
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
              onPublish={() => openOverlay("publish")}
            />
            <RoleCoverageCard roleCoverage={rota.roleCoverage} />
          </div>
        </div>
      </div>

      <RotaOverlays
        rota={guardedRota}
        overlays={overlays}
        onPublishConfirm={handlePublish}
        onApplySuggestions={actions.handleApplySuggestions}
        onMarkShiftOpen={actions.handleMarkShiftOpen}
      />
    </AppShell>
  );
}
