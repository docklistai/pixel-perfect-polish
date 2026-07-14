import { createFileRoute } from "@tanstack/react-router";
import { AppShell, Card, FeedbackBanner } from "@/components/dl";
import { useRotaPage } from "@/features/rota/hooks/useRotaPage";

import { RotaPageHeader } from "@/features/rota/components/RotaPageHeader";
import { RotaGridToolbar } from "@/features/rota/components/RotaGridToolbar";
import { RotaGrid } from "@/features/rota/components/RotaGrid";
import { RotaGridLegendBar } from "@/features/rota/components/RotaGridLegendBar";
import { RotaLeaveDataWarning } from "@/features/rota/components/RotaLeaveDataWarning";
import { RotaInsightsColumn } from "@/features/rota/components/RotaInsightsColumn";
import { RotaOverlays } from "@/features/rota/components/RotaOverlays";
import { RoleColoursContext } from "@/features/rota/components/grid/roleColoursContext";
import { requireManagerAccess } from "@/features/auth";
import { parseRotaWeekSearch } from "@/features/rota/lib/rotaSearch";

export const Route = createFileRoute("/rota")({
  beforeLoad: ({ context }) => requireManagerAccess(context.auth),
  validateSearch: parseRotaWeekSearch,
  head: () => ({ meta: [{ title: "Rota — Docklist" }] }),
  component: RotaPage,
});

const SCHEDULE_TITLE_ID = "rota-schedule-title";
const SCHEDULE_DESC_ID = "rota-schedule-desc";

function RotaPage() {
  const { week, location } = Route.useSearch();
  const {
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
    availability,
    workingTimeAlertCount,
    leaveDataState,
    publishState,
    headerStatusTone,
    headerStatusLabel,
    handlePublish,
    handleLocationChange,
    handleChooseRecoveryCandidate,
    recoverySelection,
    setRecoverySelection,
    showInsights,
    setShowInsights,
    roleColoursConfig,
    history,
  } = useRotaPage(week, location);

  return (
    <RoleColoursContext.Provider value={roleColoursConfig}>
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
            locations={rota.source === "live" ? rota.liveLocations : []}
            locationId={rota.source === "live" ? rota.liveLocationId : null}
            onLocationChange={handleLocationChange}
            locationChangeDisabled={rota.liveMutationPending}
            staffCount={rota.staff.length}
            statusTone={headerStatusTone}
            statusLabel={headerStatusLabel}
            canPublish={publishEligibility.canPublish}
            onPrintRota={() => window.print()}
            onClearWeek={guardedRota.requestClearWeek}
            onOpenTemplates={() => openOverlay("templates")}
            onCopyDay={() => openOverlay("copyDay")}
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
                onUndo={() => void history.undo()}
                onRedo={() => void history.redo()}
                canUndo={history.canUndo}
                canRedo={history.canRedo}
              />
              <RotaGrid
                days={rota.days}
                staffRows={availability.staffRows}
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
              <RotaGridLegendBar staffCount={rota.visibleStaff.length} roleColours={roleColours} />
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
              availabilityClashes={availability.clashes}
              availabilityDataState={availability.dataState}
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
          constraintClashCount={availability.clashes.length}
          availabilityDataState={availability.dataState}
          suggestedAssignTo={
            recoverySelection?.shiftId === rota.selectedShiftId ? recoverySelection.staffId : null
          }
          onClearRecoverySelection={() => setRecoverySelection(null)}
        />
      </AppShell>
    </RoleColoursContext.Provider>
  );
}
