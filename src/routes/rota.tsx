import { createFileRoute, useNavigate } from "@tanstack/react-router";
import * as React from "react";
import { toast } from "sonner";
import { AppShell, Card, ConfirmDialog, FeedbackBanner } from "@/components/dl";
import { useRotaDraftController } from "@/features/rota/hooks/useRotaDraftController";
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
import { AddShiftDrawer } from "@/features/rota/components/AddShiftDrawer";
import { ConflictDrawer } from "@/features/rota/components/ConflictDrawer";
import { GenerateRotaDialog } from "@/features/rota/components/GenerateRotaDialog";
import { ShiftDetailDrawer } from "@/features/rota/components/ShiftDetailDrawer";
import { RotaFiltersDrawer } from "@/features/rota/components/RotaFiltersDrawer";
import { TemplatesDialog } from "@/features/rota/components/TemplatesDialog";
import { CoverageDetailsDrawer } from "@/features/rota/components/CoverageDetailsDrawer";
import { WorkingTimeDetailsDrawer } from "@/features/rota/components/WorkingTimeDetailsDrawer";
import { PublishRotaDialog } from "@/features/rota/components/PublishRotaDialog";

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
  const navigate = useNavigate();
  const { askAssistant } = useOverlays();
  const [addOpen, setAddOpen] = React.useState(false);
  const [publishOpen, setPublishOpen] = React.useState(false);
  const [conflictOpen, setConflictOpen] = React.useState(false);
  const [generateOpen, setGenerateOpen] = React.useState(false);
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [templatesOpen, setTemplatesOpen] = React.useState(false);
  const [coverageDetailsOpen, setCoverageDetailsOpen] = React.useState(false);
  const [workingTimeOpen, setWorkingTimeOpen] = React.useState(false);
  const [fillSummary, setFillSummary] = React.useState<string | null>(null);

  useIntentHandler("rota.publish", () => setPublishOpen(true));
  useIntentHandler("rota.generate", () => setGenerateOpen(true));
  useIntentHandler("rota.addShift", () => setAddOpen(true));

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
  const handlePublish = (prepareStaffUpdate: boolean) => {
    rota.handlePublish();
    setPublishOpen(false);
    toast.success("Rota published", {
      description: prepareStaffUpdate
        ? "Published snapshot ready. Staff-app update prepared for review."
        : "Staff see the published snapshot the next time they open the app.",
      action: {
        label: "Preview staff app",
        onClick: () => navigate({ to: "/portal" }),
      },
    });
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
  const handleCopyLastWeek = () => {
    rota.copyPreviousWeek();
    toast.success("Pattern copied", {
      description: "Last week's pattern applied as a draft. Review before publishing.",
    });
  };

  const findShift = (shiftId: string) => rota.draftShifts.find((s) => s.id === shiftId);
  const colourLabel = (presetId: string) =>
    presetId.charAt(0).toUpperCase() + presetId.slice(1).toLowerCase();

  const handleDuplicateShift = (shiftId: string) => {
    const newId = rota.duplicateShiftToNextDay(shiftId);
    if (!newId) return;
    toast.success("Shift duplicated", {
      description: "Copied to the next day (draft).",
      action: {
        label: "Undo",
        onClick: () => {
          rota.removeShiftNow(newId);
          toast.info("Undone", { description: "Duplicate removed." });
        },
      },
    });
  };

  const handleMarkShiftOpen = (shiftId: string) => {
    const prev = findShift(shiftId);
    rota.markShiftOpen(shiftId);
    toast.info("Marked as open", {
      description: "Shift now needs cover (draft).",
      ...(prev && prev.staffId
        ? {
            action: {
              label: "Undo",
              onClick: () => {
                rota.updateShift(shiftId, {
                  staffId: prev.staffId,
                  status: "scheduled",
                  tone: prev.tone === "open" ? "info" : prev.tone,
                });
                toast.info("Reverted", { description: "Shift restored." });
              },
            },
          }
        : {}),
    });
  };

  const handleClearShift = (shiftId: string) => {
    const prev = findShift(shiftId);
    if (!prev) return;
    const restored = {
      ...prev,
      status: prev.staffId ? ("scheduled" as const) : ("open" as const),
    };
    rota.removeShiftNow(shiftId);
    toast.warning("Shift cleared", {
      description: "Removed from this week's draft.",
      action: {
        label: "Undo",
        onClick: () => {
          rota.restoreShift(restored);
          toast.success("Restored", { description: "Shift restored." });
        },
      },
    });
  };

  const handleSetShiftDept = (shiftId: string, dept: string) => {
    const prev = findShift(shiftId)?.deptOverride;
    rota.updateShift(shiftId, { deptOverride: dept, edited: true });
    toast.info("Department changed", {
      description: `Shift set to ${dept} (draft).`,
      action: {
        label: "Undo",
        onClick: () => {
          rota.updateShift(shiftId, { deptOverride: prev });
          toast.info("Reverted", { description: "Department change undone." });
        },
      },
    });
  };

  const handleSetShiftColour = (shiftId: string, presetId: string) => {
    const prev = findShift(shiftId)?.colourOverride;
    rota.updateShift(shiftId, { colourOverride: presetId });
    toast.success("Colour overridden", {
      description: `Chip now shows in ${colourLabel(presetId)}.`,
      action: {
        label: "Undo",
        onClick: () => {
          rota.updateShift(shiftId, { colourOverride: prev });
          toast.info("Colour reset", { description: "Chip back to previous colour." });
        },
      },
    });
  };

  const handleResetShiftColour = (shiftId: string) => {
    const prev = findShift(shiftId);
    rota.updateShift(shiftId, { colourOverride: undefined, deptOverride: undefined });
    toast.info("Colour reset", {
      description: "Chip back to department default.",
      ...(prev
        ? {
            action: {
              label: "Undo",
              onClick: () => {
                rota.updateShift(shiftId, {
                  colourOverride: prev.colourOverride,
                  deptOverride: prev.deptOverride,
                });
                toast.info("Restored", { description: "Override restored." });
              },
            },
          }
        : {}),
    });
  };

  return (
    <AppShell>
      <div className="w-full max-w-full overflow-x-hidden">
        <RotaPageHeader
          weekLabel={rota.weekLabel}
          staffCount={rota.staff.length}
          statusTone={headerStatusTone}
          statusLabel={headerStatusLabel}
          canPublish={!rota.published || rota.hasUnpublishedChanges}
          onTemplates={() => setTemplatesOpen(true)}
          onPrintRota={() => window.print()}
          onClearWeek={rota.requestClearWeek}
          onCopyLastWeek={handleCopyLastWeek}
          onGenerateRota={() => setGenerateOpen(true)}
          onAskAssistant={askAssistant}
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
          weekLabel={rota.weekLabel}
          staff={rota.staff}
          onPublish={() => setPublishOpen(true)}
          onViewConflicts={() => setConflictOpen(true)}
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
              workingTimeAlertCount={workingTimeAlertCount}
              coveragePct={rota.coveragePct}
              onFilter={() => setFiltersOpen(true)}
              onGenerateRota={() => setGenerateOpen(true)}
              onAddShift={() => setAddOpen(true)}
              onViewConflicts={() => setConflictOpen(true)}
              onViewWorkingTime={() => setWorkingTimeOpen(true)}
              onCopyLastWeek={handleCopyLastWeek}
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
              onShiftDuplicate={handleDuplicateShift}
              onShiftRemove={rota.requestRemoveShift}
              onShiftClear={handleClearShift}
              onShiftMarkOpen={handleMarkShiftOpen}
              onShiftSetDept={handleSetShiftDept}
              onShiftSetColour={handleSetShiftColour}
              onShiftResetColour={handleResetShiftColour}
              onShiftAdd={rota.addShift}
              onShiftUpdate={rota.updateShift}
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
            <LegendCard shifts={rota.draftShifts} />
            <IssuesToResolveCard
              conflicts={rota.conflictSummaries}
              workingTimeAlerts={rota.workingTimeAlertList}
              onReviewShift={rota.setSelectedShiftId}
              onAskAssistant={askAssistant}
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
      <PublishRotaDialog
        open={publishOpen}
        onOpenChange={setPublishOpen}
        weekLabel={rota.weekLabel}
        staffCount={rota.staff.length}
        assignedShiftCount={rota.assignedShiftCount}
        plannedShiftCount={rota.plannedShiftCount}
        coveragePct={rota.coveragePct}
        conflictCount={rota.conflictCount}
        openShiftCount={rota.openShiftCount}
        workingTimeAlertCount={workingTimeAlertCount}
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
      <RotaFiltersDrawer
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        filters={rota.filters}
        roleOptions={rota.roleOptions}
        onFiltersChange={rota.setFilters}
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
        onMarkOpen={handleMarkShiftOpen}
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
