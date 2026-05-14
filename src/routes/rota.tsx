import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { AppShell, Card, ConfirmDialog } from "@/components/dl";
import { useRotaDraftController } from "@/features/rota/hooks/useRotaDraftController";
import type { RotaViewMode } from "@/features/rota/types";

import { RotaPageHeader } from "@/features/rota/components/RotaPageHeader";
import { RotaStatusBanner } from "@/features/rota/components/RotaStatusBanner";
import { RotaGridToolbar } from "@/features/rota/components/RotaGridToolbar";
import { RotaGrid } from "@/features/rota/components/RotaGrid";
import { RotaGridLegendBar } from "@/features/rota/components/RotaGridLegendBar";
import { LabourSummaryCard } from "@/features/rota/components/LabourSummaryCard";
import { AlertsCard } from "@/features/rota/components/AlertsCard";
import { PublishReadinessCard } from "@/features/rota/components/PublishReadinessCard";
import { RoleCoverageCard } from "@/features/rota/components/RoleCoverageCard";
import { LegendCard } from "@/features/rota/components/LegendCard";
import { AddShiftDrawer } from "@/features/rota/components/AddShiftDrawer";
import { ConflictDrawer } from "@/features/rota/components/ConflictDrawer";
import { GenerateRotaDialog } from "@/features/rota/components/GenerateRotaDialog";
import { ShiftDetailDrawer } from "@/features/rota/components/ShiftDetailDrawer";
import { WeekPickerDialog } from "@/features/rota/components/WeekPickerDialog";
import { RotaFiltersDrawer } from "@/features/rota/components/RotaFiltersDrawer";
import { ViewModeDialog } from "@/features/rota/components/ViewModeDialog";
import { MoreActionsDialog } from "@/features/rota/components/MoreActionsDialog";
import { TemplatesDialog } from "@/features/rota/components/TemplatesDialog";
import { CoverageDetailsDrawer } from "@/features/rota/components/CoverageDetailsDrawer";
import { WorkingTimeDetailsDrawer } from "@/features/rota/components/WorkingTimeDetailsDrawer";

export const Route = createFileRoute("/rota")({
  head: () => ({ meta: [{ title: "Rota — Docklist" }] }),
  component: RotaPage,
});

const SCHEDULE_TITLE_ID = "rota-schedule-title";
const SCHEDULE_DESC_ID = "rota-schedule-desc";
const VIEW_MODE_LABELS: Record<RotaViewMode, string> = {
  employee: "Employee",
  role: "Role",
  day: "Day",
};
function RotaPage() {
  const rota = useRotaDraftController();
  const [addOpen, setAddOpen] = React.useState(false);
  const [publishOpen, setPublishOpen] = React.useState(false);
  const [conflictOpen, setConflictOpen] = React.useState(false);
  const [generateOpen, setGenerateOpen] = React.useState(false);
  const [weekPickerOpen, setWeekPickerOpen] = React.useState(false);
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [viewModeOpen, setViewModeOpen] = React.useState(false);
  const [moreActionsOpen, setMoreActionsOpen] = React.useState(false);
  const [templatesOpen, setTemplatesOpen] = React.useState(false);
  const [coverageDetailsOpen, setCoverageDetailsOpen] = React.useState(false);
  const [workingTimeOpen, setWorkingTimeOpen] = React.useState(false);

  const workingTimeAlertCount = rota.workingTimeAlertList.length;
  const reviewConflictShift = (shiftId: string) => {
    rota.setSelectedShiftId(shiftId);
    setConflictOpen(false);
  };
  const handlePublish = () => {
    rota.handlePublish();
    setPublishOpen(false);
  };
  const confirmationTone =
    rota.confirmation?.kind === "remove" || rota.confirmation?.kind === "clear"
      ? "danger"
      : "brand";
  const headerStatusTone = !rota.published || rota.hasUnpublishedChanges ? "warning" : "success";
  const headerStatusLabel = !rota.published
    ? "Draft · local only"
    : rota.hasUnpublishedChanges
      ? "Local publish · draft changes waiting"
      : "Local publish · no draft changes";

  return (
    <AppShell>
      <RotaPageHeader
        weekLabel={rota.weekLabel}
        viewModeLabel={VIEW_MODE_LABELS[rota.viewMode]}
        statusTone={headerStatusTone}
        statusLabel={headerStatusLabel}
        onPrevWeek={() => rota.setWeekOffset((w) => w - 1)}
        onPickWeek={() => setWeekPickerOpen(true)}
        onNextWeek={() => rota.setWeekOffset((w) => w + 1)}
        onChangeViewMode={() => setViewModeOpen(true)}
        onMoreActions={() => setMoreActionsOpen(true)}
      />

      <RotaStatusBanner
        published={rota.published}
        hasUnpublishedChanges={rota.hasUnpublishedChanges}
        openShiftCount={rota.openShiftCount}
        conflictCount={rota.conflictCount}
        coveragePct={rota.coveragePct}
        onPublish={() => setPublishOpen(true)}
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
        <Card className="overflow-hidden p-0">
          <RotaGridToolbar
            conflictCount={rota.conflictCount}
            openShiftCount={rota.openShiftCount}
            coveragePct={rota.coveragePct}
            onFilter={() => setFiltersOpen(true)}
            onGenerateRota={() => setGenerateOpen(true)}
            onAddShift={() => setAddOpen(true)}
            onViewConflicts={() => setConflictOpen(true)}
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
            onShiftOpen={rota.setSelectedShiftId}
            onShiftDuplicate={rota.duplicateShiftAsOpen}
            onShiftRemove={rota.requestRemoveShift}
            onShiftMarkOpen={rota.markShiftOpen}
          />
          <RotaGridLegendBar staffCount={rota.visibleStaff.length} />
        </Card>

        <div className="space-y-3.5">
          <LabourSummaryCard
            scheduledHours={rota.scheduledHours}
            coveragePct={rota.coveragePct}
            onViewCoverageDetails={() => setCoverageDetailsOpen(true)}
          />
          <AlertsCard
            openShiftCount={rota.openShiftCount}
            conflictCount={rota.conflictCount}
            workingTimeAlertCount={workingTimeAlertCount}
            onAddShift={() => setAddOpen(true)}
            onViewConflicts={() => setConflictOpen(true)}
            onWorkingTimeAlert={() => setWorkingTimeOpen(true)}
          />
          <PublishReadinessCard
            published={rota.published}
            hasUnpublishedChanges={rota.hasUnpublishedChanges}
            conflictCount={rota.conflictCount}
            assignedShiftCount={rota.assignedShiftCount}
            plannedShiftCount={rota.plannedShiftCount}
            coveragePct={rota.coveragePct}
            onPublish={() => setPublishOpen(true)}
          />
          <RoleCoverageCard roleCoverage={rota.roleCoverage} />
          <LegendCard />
        </div>
      </div>

      <AddShiftDrawer
        open={addOpen}
        onOpenChange={setAddOpen}
        days={rota.days}
        staff={rota.staff}
        roles={rota.roleOptions}
        onSubmit={rota.addShift}
      />
      <ConflictDrawer
        open={conflictOpen}
        onOpenChange={setConflictOpen}
        conflicts={rota.conflictSummaries}
        onReviewShift={reviewConflictShift}
      />
      <ConfirmDialog
        open={publishOpen}
        onOpenChange={setPublishOpen}
        title={`${rota.published ? "Update" : "Mark"} local publish for w/c ${rota.weekLabel}?`}
        description="This records a local published state for this planning screen. Real staff visibility will come when snapshots are connected."
        confirmLabel={rota.published ? "Update local publish" : "Mark published locally"}
        cancelLabel="Not yet"
        onConfirm={handlePublish}
      />
      <GenerateRotaDialog
        open={generateOpen}
        onOpenChange={setGenerateOpen}
        weekLabel={rota.weekLabel}
        shifts={rota.draftShifts}
        staff={rota.staff}
        onApplySuggestions={rota.requestApplyOpenShiftSuggestions}
      />
      <WeekPickerDialog
        open={weekPickerOpen}
        onOpenChange={setWeekPickerOpen}
        weekLabel={rota.weekLabel}
        onSelectOffset={rota.setWeekOffset}
      />
      <RotaFiltersDrawer
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        filters={rota.filters}
        roleOptions={rota.roleOptions}
        onFiltersChange={rota.setFilters}
      />
      <ViewModeDialog
        open={viewModeOpen}
        onOpenChange={setViewModeOpen}
        viewMode={rota.viewMode}
        onViewModeChange={rota.setViewMode}
      />
      <MoreActionsDialog
        open={moreActionsOpen}
        onOpenChange={setMoreActionsOpen}
        onTemplates={() => setTemplatesOpen(true)}
        onClearWeek={rota.requestClearWeek}
      />
      <TemplatesDialog
        open={templatesOpen}
        onOpenChange={setTemplatesOpen}
        onApplyStandardTemplate={rota.requestApplyStandardTemplate}
      />
      <CoverageDetailsDrawer
        open={coverageDetailsOpen}
        onOpenChange={setCoverageDetailsOpen}
        staffCount={rota.staff.length}
        openShiftCount={rota.openShiftCount}
        conflictCount={rota.conflictCount}
        coveragePct={rota.coveragePct}
        roleCoverage={rota.roleCoverage}
      />
      <WorkingTimeDetailsDrawer
        open={workingTimeOpen}
        onOpenChange={setWorkingTimeOpen}
        alerts={rota.workingTimeAlertList}
      />
      <ShiftDetailDrawer
        key={rota.selectedShiftId ?? "none"}
        shift={rota.selectedShift}
        staff={rota.staff}
        days={rota.days}
        onClose={rota.closeShiftDetail}
        onUpdate={rota.updateShift}
        onRemove={rota.requestRemoveShift}
        onMarkOpen={rota.markShiftOpen}
      />
      <ConfirmDialog
        open={Boolean(rota.confirmation)}
        onOpenChange={(open) => !open && rota.clearConfirmation()}
        title={rota.confirmation?.title ?? ""}
        description={rota.confirmation?.description ?? ""}
        confirmLabel={rota.confirmation?.confirmLabel ?? "Confirm"}
        cancelLabel="Cancel"
        tone={confirmationTone}
        onConfirm={rota.confirmPendingAction}
      />
    </AppShell>
  );
}
