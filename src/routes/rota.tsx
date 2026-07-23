import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell, Card, FeedbackBanner } from "@/components/dl";
import { useRotaPage } from "@/features/rota/hooks/useRotaPage";

import { RotaPageHeader } from "@/features/rota/components/RotaPageHeader";
import { RotaGridToolbar } from "@/features/rota/components/RotaGridToolbar";
import { RotaGrid } from "@/features/rota/components/RotaGrid";
import { RotaGridLegendBar } from "@/features/rota/components/RotaGridLegendBar";
import { RotaLeaveDataWarning } from "@/features/rota/components/RotaLeaveDataWarning";
import { RotaLiveReadState } from "@/features/rota/components/RotaLiveReadState";
import { RotaInsightsColumn } from "@/features/rota/components/RotaInsightsColumn";
import { RotaOverlays } from "@/features/rota/components/RotaOverlays";
import { RoleColoursContext } from "@/features/rota/components/grid/roleColoursContext";
import { PrintableRota } from "@/features/rota/print/PrintableRota";
import { useRotaPrintDocument } from "@/features/rota/hooks/useRotaPrintDocument";
import { requireManagerAccess } from "@/features/auth";
import { useManagerIdentity } from "@/features/auth/hooks/useManagerIdentity";
import { useRotaDepartmentWiring } from "@/features/rota/hooks/useRotaDepartmentWiring";
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

  const { workspaceName } = useManagerIdentity();
  const departmentWiring = useRotaDepartmentWiring({
    staff: rota.staff,
    updateShift: guardedRota.updateShift,
  });
  const locationName =
    rota.source === "live" && rota.liveLocationName ? rota.liveLocationName : "Your workspace";

  const printDocument = useRotaPrintDocument({
    workspaceName,
    locationName,
    weekLabel: rota.weekLabel,
    dayLabels: rota.days.map((day) => day.d),
    staff: rota.staff,
    shifts: rota.draftShifts,
    published: rota.published,
    hasUnpublishedChanges: rota.hasUnpublishedChanges,
    departmentNameById: departmentWiring.nameById,
  });
  const bulkRunners = React.useMemo(
    () => ({ ...rota.bulkRunners, onApplied: history.reset }),
    [history.reset, rota.bulkRunners],
  );

  return (
    <RoleColoursContext.Provider value={roleColoursConfig}>
      <AppShell topbarWeekLabel={rota.weekLabel}>
        <div className="w-full max-w-full overflow-x-hidden">
          {rota.source === "live" && (
            <RotaLeaveDataWarning
              isLoading={rota.isLiveLeaveLoading}
              isError={rota.isLiveLeaveError}
            />
          )}

          <RotaPageHeader
            weekLabel={rota.weekLabel}
            locationName={locationName}
            locations={rota.source === "live" ? rota.liveLocations : []}
            locationId={rota.source === "live" ? rota.liveLocationId : null}
            onLocationChange={handleLocationChange}
            locationChangeDisabled={rota.liveMutationPending}
            staffCount={rota.staff.length}
            statusTone={headerStatusTone}
            statusLabel={headerStatusLabel}
            canPublish={publishEligibility.canPublish}
            onPrintRota={printDocument.print}
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

          {readOnly ? (
            // Live workspace, reads not settled: a dedicated loading/error
            // surface — never the demo grid, never a premature empty state.
            <RotaLiveReadState isError={rota.isLiveError} onRetry={() => void rota.retryLive()} />
          ) : (
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
                  onBuildWeek={() => openOverlay("buildWeek")}
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
                  // A different week, data source or location invalidates every
                  // stored selection key, so the grid drops the rectangle.
                  selectionResetKey={`${rota.source}|${rota.liveLocationId ?? ""}|${rota.weekLabel}`}
                  bulkRunners={bulkRunners}
                  weekIsEditable={rota.liveWeekStatus !== "archived"}
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
                  onShiftSetDepartment={departmentWiring.setShiftDepartment}
                  departments={departmentWiring.departments}
                  configuredRoles={rota.roleOptions}
                  onShiftSetColour={actions.handleSetShiftColour}
                  onShiftResetColour={actions.handleResetShiftColour}
                  onShiftAdd={guardedRota.addShift}
                  onShiftUpdate={guardedRota.updateShift}
                />
                <RotaGridLegendBar
                  staffCount={rota.visibleStaff.length}
                  roleColours={roleColours}
                />
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
          )}
        </div>

        <RotaOverlays
          rota={guardedRota}
          overlays={overlays}
          onPublishConfirm={handlePublish}
          onApplySuggestions={actions.handleApplySuggestions}
          onCopyLastWeek={actions.handleCopyLastWeek}
          onMarkShiftOpen={actions.handleMarkShiftOpen}
          onRepeatShift={actions.handleRepeatShift}
          publishEligibility={publishEligibility}
          constraintClashCount={availability.clashes.length}
          availabilityConstraints={availability.constraints}
          availabilityDataState={availability.dataState}
          suggestedAssignTo={
            recoverySelection?.shiftId === rota.selectedShiftId ? recoverySelection.staffId : null
          }
          onClearRecoverySelection={() => setRecoverySelection(null)}
        />

        {/* Print-only document. Renders nothing on screen; @media print hides
            every other body child so no app chrome can reach paper. */}
        <PrintableRota model={printDocument.model} />
      </AppShell>
    </RoleColoursContext.Provider>
  );
}
