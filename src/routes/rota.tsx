import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { toast } from "sonner";
import { AppShell, Card, ConfirmDialog, FeedbackBanner } from "@/components/dl";
import { useRotaDraftController } from "@/features/rota/hooks/useRotaDraftController";

import { RotaPageHeader } from "@/features/rota/components/RotaPageHeader";
import { RotaStatusBanner } from "@/features/rota/components/RotaStatusBanner";
import { RotaGridToolbar } from "@/features/rota/components/RotaGridToolbar";
import { RotaGrid } from "@/features/rota/components/RotaGrid";
import { RotaGridLegendBar } from "@/features/rota/components/RotaGridLegendBar";
import { LabourSummaryCard } from "@/features/rota/components/LabourSummaryCard";
import { PublishReadinessCard } from "@/features/rota/components/PublishReadinessCard";
import { RoleCoverageCard } from "@/features/rota/components/RoleCoverageCard";
import { LegendCard } from "@/features/rota/components/LegendCard";
import { AddShiftDrawer } from "@/features/rota/components/AddShiftDrawer";
import { ConflictDrawer } from "@/features/rota/components/ConflictDrawer";
import { GenerateRotaDialog } from "@/features/rota/components/GenerateRotaDialog";
import { ShiftDetailDrawer } from "@/features/rota/components/ShiftDetailDrawer";
import { WeekPickerDialog } from "@/features/rota/components/WeekPickerDialog";
import { RotaFiltersDrawer } from "@/features/rota/components/RotaFiltersDrawer";
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

type PublishState = "draft" | "unpublished-changes" | "ready" | "published" | "published-issues";

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
  const [addOpen, setAddOpen] = React.useState(false);
  const [publishOpen, setPublishOpen] = React.useState(false);
  const [conflictOpen, setConflictOpen] = React.useState(false);
  const [generateOpen, setGenerateOpen] = React.useState(false);
  const [weekPickerOpen, setWeekPickerOpen] = React.useState(false);
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [moreActionsOpen, setMoreActionsOpen] = React.useState(false);
  const [templatesOpen, setTemplatesOpen] = React.useState(false);
  const [coverageDetailsOpen, setCoverageDetailsOpen] = React.useState(false);
  const [workingTimeOpen, setWorkingTimeOpen] = React.useState(false);
  const [fillSummary, setFillSummary] = React.useState<string | null>(null);

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
  const headerStatusTone =
    publishState === "published" || publishState === "ready" ? "success" : "warning";
  const headerStatusLabel = publishStateLabel(publishState);

  const handleApplySuggestions = () => {
    const suggestions = rota.applyOpenShiftSuggestions();
    setFillSummary(
      suggestions.length > 0
        ? `${suggestions.length} open shift${suggestions.length === 1 ? "" : "s"} filled. Review the assignments before publishing.`
        : "No open shifts could be filled from the current staff list.",
    );
  };

  const publishTitle = hasReadinessIssues
    ? `Publish rota with ${readinessIssueCount} unresolved issue${readinessIssueCount === 1 ? "" : "s"}?`
    : `Publish rota for w/c ${rota.weekLabel}?`;
  const publishDescription = hasReadinessIssues
    ? `${rota.openShiftCount} open shift${rota.openShiftCount === 1 ? "" : "s"}, ${rota.conflictCount} conflict${rota.conflictCount === 1 ? "" : "s"}, and ${workingTimeAlertCount} working time alert${workingTimeAlertCount === 1 ? "" : "s"} remain. Staff should only see the published rota, so publish with issues only if the team is ready for this version.`
    : "Staff should only see the published rota. Publish when this week is ready for the team.";
  const publishConfirmLabel = hasReadinessIssues ? "Publish with issues" : "Publish rota";

  return (
    <AppShell>
      <div className="w-full max-w-full overflow-x-hidden">
        <RotaPageHeader
          weekLabel={rota.weekLabel}
          staffCount={rota.staff.length}
          statusTone={headerStatusTone}
          statusLabel={headerStatusLabel}
          canPublish={!rota.published || rota.hasUnpublishedChanges}
          onPrevWeek={() => rota.setWeekOffset((w) => w - 1)}
          onPickWeek={() => setWeekPickerOpen(true)}
          onNextWeek={() => rota.setWeekOffset((w) => w + 1)}
          onMoreActions={() => setMoreActionsOpen(true)}
          onGenerateRota={() => setGenerateOpen(true)}
          onPublish={() => setPublishOpen(true)}
        />

        <RotaStatusBanner
          published={rota.published}
          hasUnpublishedChanges={rota.hasUnpublishedChanges}
          publishState={publishState}
          openShiftCount={rota.openShiftCount}
          conflictCount={rota.conflictCount}
          workingTimeAlertCount={workingTimeAlertCount}
          coveragePct={rota.coveragePct}
          onPublish={() => setPublishOpen(true)}
        />

        {fillSummary && (
          <FeedbackBanner
            tone="info"
            title="Open shifts updated"
            description={fillSummary}
            className="mb-4"
            onDismiss={() => setFillSummary(null)}
          />
        )}

        <div className="grid min-w-0 grid-cols-1 gap-4 overflow-x-hidden xl:grid-cols-[minmax(0,1fr)_300px]">
          <Card className="min-w-0 overflow-hidden p-0">
            <RotaGridToolbar
              conflictCount={rota.conflictCount}
              openShiftCount={rota.openShiftCount}
              coveragePct={rota.coveragePct}
              onFilter={() => setFiltersOpen(true)}
              onGenerateRota={() => setGenerateOpen(true)}
              onAddShift={() => setAddOpen(true)}
              onViewConflicts={() => setConflictOpen(true)}
              onCopyLastWeek={() =>
                toast.info("Copy last week", {
                  description: "Duplicating a draft is not wired in this prototype.",
                })
              }
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

          <div className="space-y-3">
            <LabourSummaryCard
              scheduledHours={rota.scheduledHours}
              targetHours={rota.targetHours}
              coveragePct={rota.coveragePct}
              onViewCoverageDetails={() => setCoverageDetailsOpen(true)}
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
              onPublish={() => setPublishOpen(true)}
            />
            <RoleCoverageCard roleCoverage={rota.roleCoverage} />
            <LegendCard />
          </div>
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
        title={publishTitle}
        description={publishDescription}
        confirmLabel={publishConfirmLabel}
        cancelLabel="Keep reviewing"
        tone={hasReadinessIssues ? "danger" : "brand"}
        onConfirm={handlePublish}
      />
      <GenerateRotaDialog
        open={generateOpen}
        onOpenChange={setGenerateOpen}
        weekLabel={rota.weekLabel}
        days={rota.days}
        shifts={rota.draftShifts}
        staff={rota.staff}
        onApplySuggestions={handleApplySuggestions}
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
