import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { AppShell, Card, ConfirmDialog } from "@/components/dl";
import { getWeekLabel, getWeekDayLabels } from "@/features/rota/lib/weekHelpers";
import { staff, baseDayStats, initialDraftShifts } from "@/features/rota/data/mockData";
import {
  applyShiftPatch,
  buildOpenRow,
  buildStaffRows,
  createInitialDraftShifts,
  fillOpenShiftsWithSuggestions,
  makeDraftShift,
} from "@/features/rota/lib/draftRota";
import {
  buildConflictSummaries,
  buildRoleCoverage,
  countAssignedShifts,
  countConflicts,
  countOpenShifts,
  countPlannedShifts,
  coveragePercent,
  filterStaff,
  totalScheduledHours,
  workingTimeAlerts,
} from "@/features/rota/lib/rotaSummaries";
import type {
  DraftShift,
  DraftShiftInput,
  RotaFilters,
  RotaViewMode,
  ShiftId,
} from "@/features/rota/types";

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
import { CopyLastWeekDialog } from "@/features/rota/components/CopyLastWeekDialog";
import { CoverageDetailsDrawer } from "@/features/rota/components/CoverageDetailsDrawer";
import { WorkingTimeDetailsDrawer } from "@/features/rota/components/WorkingTimeDetailsDrawer";
import { AddStaffDialog } from "@/features/rota/components/AddStaffDialog";

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
const DEFAULT_ROTA_FILTERS: RotaFilters = {
  department: "all",
  shiftStatus: "all",
  warningType: "all",
};

function RotaPage() {
  const [addOpen, setAddOpen] = React.useState(false);
  const [addStaffOpen, setAddStaffOpen] = React.useState(false);
  const [publishOpen, setPublishOpen] = React.useState(false);
  const [conflictOpen, setConflictOpen] = React.useState(false);
  const [generateOpen, setGenerateOpen] = React.useState(false);
  const [weekPickerOpen, setWeekPickerOpen] = React.useState(false);
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [viewModeOpen, setViewModeOpen] = React.useState(false);
  const [moreActionsOpen, setMoreActionsOpen] = React.useState(false);
  const [templatesOpen, setTemplatesOpen] = React.useState(false);
  const [copyLastWeekOpen, setCopyLastWeekOpen] = React.useState(false);
  const [coverageDetailsOpen, setCoverageDetailsOpen] = React.useState(false);
  const [workingTimeOpen, setWorkingTimeOpen] = React.useState(false);
  const [published, setPublished] = React.useState(false);
  const [hasUnpublishedChanges, setHasUnpublishedChanges] = React.useState(false);
  const [selectedShiftId, setSelectedShiftId] = React.useState<ShiftId | null>(null);
  const [weekOffset, setWeekOffset] = React.useState(0);
  const [filters, setFilters] = React.useState<RotaFilters>(DEFAULT_ROTA_FILTERS);
  const [staffSearch, setStaffSearch] = React.useState("");
  const [viewMode, setViewMode] = React.useState<RotaViewMode>("employee");
  const [draftShifts, setDraftShifts] = React.useState<DraftShift[]>(() =>
    createInitialDraftShifts(initialDraftShifts),
  );

  const weekLabel = getWeekLabel(weekOffset);
  const days = getWeekDayLabels(weekOffset).map((d, i) => ({ d, ...baseDayStats[i] }));
  const dayLabels = days.map((d) => d.d);
  const roleOptions = Array.from(new Set(staff.map((row) => row.role)));
  const visibleStaff = filterStaff(staff, draftShifts, filters, staffSearch);
  const hasActiveFilters =
    staffSearch.trim().length > 0 ||
    filters.department !== "all" ||
    filters.shiftStatus !== "all" ||
    filters.warningType !== "all";
  const staffRows = buildStaffRows(visibleStaff, draftShifts);
  const openRow = buildOpenRow(draftShifts);

  const openShiftCount = countOpenShifts(draftShifts);
  const conflictCount = countConflicts(draftShifts);
  const assignedShiftCount = countAssignedShifts(draftShifts);
  const plannedShiftCount = countPlannedShifts(draftShifts);
  const conflictSummaries = buildConflictSummaries(draftShifts, staff, dayLabels);
  const roleCoverage = buildRoleCoverage(staff, draftShifts);
  const coveragePct = coveragePercent(staff, draftShifts);
  const scheduledHours = totalScheduledHours(draftShifts);
  const workingTimeAlertList = workingTimeAlerts(staff, draftShifts);
  const workingTimeAlertCount = workingTimeAlertList.length;

  const selectedShift = selectedShiftId
    ? (draftShifts.find((s) => s.id === selectedShiftId) ?? null)
    : null;

  const markDirty = () => setHasUnpublishedChanges(true);
  const closeShiftDetail = () => setSelectedShiftId(null);

  const addShift = (input: DraftShiftInput) => {
    setDraftShifts((current) => [...current, makeDraftShift(input)]);
    markDirty();
  };
  const updateShift = (id: ShiftId, patch: Partial<DraftShift>) => {
    setDraftShifts((current) => current.map((s) => (s.id === id ? applyShiftPatch(s, patch) : s)));
    markDirty();
  };
  const removeShift = (id: ShiftId) => {
    setDraftShifts((current) => current.filter((s) => s.id !== id));
    if (selectedShiftId === id) closeShiftDetail();
    markDirty();
  };
  const markShiftOpen = (id: ShiftId) =>
    updateShift(id, { staffId: null, status: "open", tone: "open" });
  const applyStandardTemplate = () => {
    setDraftShifts(createInitialDraftShifts(initialDraftShifts));
    markDirty();
  };
  const applyOpenShiftSuggestions = () => {
    setDraftShifts((current) => fillOpenShiftsWithSuggestions(current, staff).shifts);
    markDirty();
  };
  const reviewConflictShift = (shiftId: ShiftId) => {
    setSelectedShiftId(shiftId);
    setConflictOpen(false);
  };

  const handlePublish = () => {
    setPublished(true);
    setHasUnpublishedChanges(false);
    setPublishOpen(false);
  };

  const headerStatusTone = !published || hasUnpublishedChanges ? "warning" : "success";
  const headerStatusLabel = !published
    ? "Draft · local changes only"
    : hasUnpublishedChanges
      ? "Published · draft changes waiting to republish"
      : "Published · staff see the last snapshot";

  return (
    <AppShell>
      <RotaPageHeader
        weekLabel={weekLabel}
        viewModeLabel={VIEW_MODE_LABELS[viewMode]}
        statusTone={headerStatusTone}
        statusLabel={headerStatusLabel}
        onPrevWeek={() => setWeekOffset((w) => w - 1)}
        onPickWeek={() => setWeekPickerOpen(true)}
        onNextWeek={() => setWeekOffset((w) => w + 1)}
        onChangeViewMode={() => setViewModeOpen(true)}
        onMoreActions={() => setMoreActionsOpen(true)}
      />

      <RotaStatusBanner
        published={published}
        hasUnpublishedChanges={hasUnpublishedChanges}
        openShiftCount={openShiftCount}
        conflictCount={conflictCount}
        coveragePct={coveragePct}
        onPublish={() => setPublishOpen(true)}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <Card className="overflow-hidden p-0">
          <RotaGridToolbar
            conflictCount={conflictCount}
            openShiftCount={openShiftCount}
            coveragePct={coveragePct}
            onFilter={() => setFiltersOpen(true)}
            onGenerateRota={() => setGenerateOpen(true)}
            onAddShift={() => setAddOpen(true)}
            onViewConflicts={() => setConflictOpen(true)}
          />
          <RotaGrid
            days={days}
            staffRows={staffRows}
            openRow={openRow}
            staffCount={staff.length}
            visibleStaffCount={visibleStaff.length}
            weekLabel={weekLabel}
            staffSearch={staffSearch}
            hasActiveFilters={hasActiveFilters}
            scheduleTitleId={SCHEDULE_TITLE_ID}
            scheduleDescId={SCHEDULE_DESC_ID}
            onStaffSearchChange={setStaffSearch}
            onClearFilters={() => {
              setStaffSearch("");
              setFilters(DEFAULT_ROTA_FILTERS);
            }}
            onShiftOpen={setSelectedShiftId}
            onAddStaff={() => setAddStaffOpen(true)}
          />
          <RotaGridLegendBar staffCount={visibleStaff.length} />
        </Card>

        <div className="space-y-3.5">
          <LabourSummaryCard
            scheduledHours={scheduledHours}
            coveragePct={coveragePct}
            onViewCoverageDetails={() => setCoverageDetailsOpen(true)}
          />
          <AlertsCard
            openShiftCount={openShiftCount}
            conflictCount={conflictCount}
            workingTimeAlertCount={workingTimeAlertCount}
            onAddShift={() => setAddOpen(true)}
            onViewConflicts={() => setConflictOpen(true)}
            onWorkingTimeAlert={() => setWorkingTimeOpen(true)}
          />
          <PublishReadinessCard
            published={published}
            hasUnpublishedChanges={hasUnpublishedChanges}
            conflictCount={conflictCount}
            assignedShiftCount={assignedShiftCount}
            plannedShiftCount={plannedShiftCount}
            coveragePct={coveragePct}
            onPublish={() => setPublishOpen(true)}
          />
          <RoleCoverageCard roleCoverage={roleCoverage} />
          <LegendCard />
        </div>
      </div>

      <AddShiftDrawer
        open={addOpen}
        onOpenChange={setAddOpen}
        days={days}
        staff={staff}
        roles={roleOptions}
        onSubmit={addShift}
      />
      <AddStaffDialog open={addStaffOpen} onOpenChange={setAddStaffOpen} />
      <ConflictDrawer
        open={conflictOpen}
        onOpenChange={setConflictOpen}
        conflicts={conflictSummaries}
        onReviewShift={reviewConflictShift}
      />
      <ConfirmDialog
        open={publishOpen}
        onOpenChange={setPublishOpen}
        title={`${published ? "Republish" : "Publish"} rota for w/c ${weekLabel}?`}
        description={`Draft changes stay local until you ${published ? "republish" : "publish"}. Staff see the last published snapshot in the staff portal.`}
        confirmLabel={published ? "Republish" : "Publish"}
        cancelLabel="Not yet"
        onConfirm={handlePublish}
      />
      <GenerateRotaDialog
        open={generateOpen}
        onOpenChange={setGenerateOpen}
        weekLabel={weekLabel}
        shifts={draftShifts}
        staff={staff}
        onApplySuggestions={applyOpenShiftSuggestions}
      />
      <WeekPickerDialog
        open={weekPickerOpen}
        onOpenChange={setWeekPickerOpen}
        weekLabel={weekLabel}
        onSelectOffset={setWeekOffset}
      />
      <RotaFiltersDrawer
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        filters={filters}
        roleOptions={roleOptions}
        onFiltersChange={setFilters}
      />
      <ViewModeDialog
        open={viewModeOpen}
        onOpenChange={setViewModeOpen}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />
      <MoreActionsDialog
        open={moreActionsOpen}
        onOpenChange={setMoreActionsOpen}
        onCopyLastWeek={() => setCopyLastWeekOpen(true)}
        onTemplates={() => setTemplatesOpen(true)}
      />
      <TemplatesDialog
        open={templatesOpen}
        onOpenChange={setTemplatesOpen}
        onApplyStandardTemplate={applyStandardTemplate}
      />
      <CopyLastWeekDialog
        open={copyLastWeekOpen}
        onOpenChange={setCopyLastWeekOpen}
        weekLabel={weekLabel}
      />
      <CoverageDetailsDrawer
        open={coverageDetailsOpen}
        onOpenChange={setCoverageDetailsOpen}
        staffCount={staff.length}
        openShiftCount={openShiftCount}
        conflictCount={conflictCount}
        coveragePct={coveragePct}
        roleCoverage={roleCoverage}
      />
      <WorkingTimeDetailsDrawer
        open={workingTimeOpen}
        onOpenChange={setWorkingTimeOpen}
        alerts={workingTimeAlertList}
      />
      <ShiftDetailDrawer
        key={selectedShiftId ?? "none"}
        shift={selectedShift}
        staff={staff}
        days={days}
        onClose={closeShiftDetail}
        onUpdate={updateShift}
        onRemove={removeShift}
        onMarkOpen={markShiftOpen}
      />
    </AppShell>
  );
}
