import { ConfirmDialog } from "@/components/dl";
import type { useRotaDraftController } from "../hooks/useRotaDraftController";
import type { RotaOverlaysState } from "../hooks/useRotaOverlays";
import type { RepeatShiftResult } from "../lib/repeatShift";
import type { RotaPublishEligibility } from "../lib/publishEligibility";
import type { ShiftId } from "../types";

import { AddShiftDrawer } from "./AddShiftDrawer";
import { ConflictDrawer } from "./ConflictDrawer";
import { GenerateRotaDialog } from "./GenerateRotaDialog";
import { ShiftDetailDrawer } from "./ShiftDetailDrawer";
import { RotaFiltersDrawer } from "./RotaFiltersDrawer";
import { CoverageDetailsDrawer } from "./CoverageDetailsDrawer";
import { WorkingTimeDetailsDrawer } from "./WorkingTimeDetailsDrawer";
import { PublishRotaDialog } from "./PublishRotaDialog";
import { DemandTemplatesDrawer } from "./DemandTemplatesDrawer";
import { CopyDayDialog } from "./CopyDayDialog";
import type { MaybePromise } from "./grid";

type RotaController = ReturnType<typeof useRotaDraftController>;

/**
 * Every rota drawer, dialog, and the destructive-action ConfirmDialog. The
 * route owns overlay state via useRotaOverlays and the toast-emitting
 * handlers; this component only wires them to the overlay components.
 */
export function RotaOverlays({
  rota,
  overlays,
  onPublishConfirm,
  onApplySuggestions,
  onMarkShiftOpen,
  onRepeatShift,
  publishEligibility,
  constraintClashCount,
  availabilityDataState,
  suggestedAssignTo,
  onClearRecoverySelection,
}: {
  rota: RotaController;
  overlays: RotaOverlaysState;
  onPublishConfirm: (acknowledgeConstraints: boolean) => MaybePromise<void>;
  onApplySuggestions: () => void;
  onMarkShiftOpen: (shiftId: ShiftId) => MaybePromise<void>;
  onRepeatShift: (shiftId: ShiftId, dayIndexes: number[]) => Promise<RepeatShiftResult | null>;
  publishEligibility: RotaPublishEligibility;
  constraintClashCount: number;
  availabilityDataState: "ready" | "loading" | "error";
  suggestedAssignTo: string | null;
  onClearRecoverySelection: () => void;
}) {
  const { openOverlays, setOverlay } = overlays;
  const workingTimeAlertCount = rota.workingTimeAlertList.length;
  const leaveDataState =
    rota.source !== "live"
      ? "ready"
      : rota.isLiveLeaveLoading
        ? "loading"
        : rota.isLiveLeaveError
          ? "error"
          : "ready";

  const reviewConflictShift = (shiftId: string) => {
    rota.setSelectedShiftId(shiftId);
    setOverlay("conflicts", false);
  };
  const confirmationTone =
    rota.confirmation?.kind === "remove" || rota.confirmation?.kind === "clear"
      ? "danger"
      : "brand";

  return (
    <>
      <AddShiftDrawer
        open={openOverlays.addShift}
        onOpenChange={(open) => setOverlay("addShift", open)}
        days={rota.days}
        staff={rota.assignableStaff}
        roles={rota.roleOptions}
        onSubmit={rota.addShift}
      />
      <ConflictDrawer
        open={openOverlays.conflicts}
        onOpenChange={(open) => setOverlay("conflicts", open)}
        conflicts={rota.conflictSummaries}
        onReviewShift={reviewConflictShift}
      />
      <PublishRotaDialog
        open={openOverlays.publish}
        onOpenChange={(open) => setOverlay("publish", open)}
        weekLabel={rota.weekLabel}
        staffCount={rota.staff.length}
        assignedShiftCount={rota.assignedShiftCount}
        plannedShiftCount={rota.plannedShiftCount}
        coveragePct={rota.coveragePct}
        conflictCount={rota.conflictCount}
        openShiftCount={rota.openShiftCount}
        workingTimeAlertCount={workingTimeAlertCount}
        leaveDataState={leaveDataState}
        constraintClashCount={constraintClashCount}
        availabilityDataState={availabilityDataState}
        published={rota.published}
        hasUnpublishedChanges={rota.hasUnpublishedChanges}
        canPublish={publishEligibility.canPublish}
        publishBlockedReason={publishEligibility.blockedReason}
        onConfirm={onPublishConfirm}
      />
      <GenerateRotaDialog
        open={openOverlays.generate}
        onOpenChange={(open) => setOverlay("generate", open)}
        weekLabel={rota.weekLabel}
        days={rota.days}
        shifts={rota.draftShifts}
        staff={rota.assignableStaff}
        leaveRequests={rota.leaveRequests}
        dayIsoDates={rota.dayIsoDates}
        onApplySuggestions={onApplySuggestions}
      />
      <RotaFiltersDrawer
        open={openOverlays.filters}
        onOpenChange={(open) => setOverlay("filters", open)}
        filters={rota.filters}
        roleOptions={rota.roleOptions}
        onFiltersChange={rota.setFilters}
      />
      <DemandTemplatesDrawer
        open={openOverlays.templates}
        onOpenChange={(open) => setOverlay("templates", open)}
        rotaWeekId={rota.source === "live" ? rota.liveRotaWeekId : null}
        weekLabel={rota.weekLabel}
      />
      <CopyDayDialog
        open={openOverlays.copyDay}
        onOpenChange={(open) => setOverlay("copyDay", open)}
        rotaWeekId={rota.source === "live" ? rota.liveRotaWeekId : null}
        dayLabels={rota.days.map((day) => day.d)}
      />
      <CoverageDetailsDrawer
        open={openOverlays.coverageDetails}
        onOpenChange={(open) => setOverlay("coverageDetails", open)}
        staffCount={rota.staff.length}
        openShiftCount={rota.openShiftCount}
        conflictCount={rota.conflictCount}
        coveragePct={rota.coveragePct}
        roleCoverage={rota.roleCoverage}
      />
      <WorkingTimeDetailsDrawer
        open={openOverlays.workingTime}
        onOpenChange={(open) => setOverlay("workingTime", open)}
        alerts={rota.workingTimeAlertList}
      />
      <ShiftDetailDrawer
        key={rota.selectedShiftId ?? "none"}
        shift={rota.selectedShift}
        staff={rota.staff}
        assignableStaff={rota.assignableStaff}
        days={rota.days}
        draftShifts={rota.draftShifts}
        leaveRequests={rota.leaveRequests}
        dayIsoDates={rota.dayIsoDates}
        suggestedAssignTo={suggestedAssignTo}
        liveRotaWeekId={rota.source === "live" ? rota.liveRotaWeekId : null}
        onClose={() => {
          onClearRecoverySelection();
          rota.closeShiftDetail();
        }}
        onUpdate={rota.updateShift}
        onRemove={rota.requestRemoveShift}
        onMarkOpen={onMarkShiftOpen}
        onRepeat={onRepeatShift}
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
    </>
  );
}
