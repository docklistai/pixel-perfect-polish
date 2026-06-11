import { ConfirmDialog } from "@/components/dl";
import type { useRotaDraftController } from "../hooks/useRotaDraftController";
import type { RotaOverlaysState } from "../hooks/useRotaOverlays";
import type { ShiftId } from "../types";

import { AddShiftDrawer } from "./AddShiftDrawer";
import { ConflictDrawer } from "./ConflictDrawer";
import { GenerateRotaDialog } from "./GenerateRotaDialog";
import { ShiftDetailDrawer } from "./ShiftDetailDrawer";
import { RotaFiltersDrawer } from "./RotaFiltersDrawer";
import { TemplatesDialog } from "./TemplatesDialog";
import { CoverageDetailsDrawer } from "./CoverageDetailsDrawer";
import { WorkingTimeDetailsDrawer } from "./WorkingTimeDetailsDrawer";
import { PublishRotaDialog } from "./PublishRotaDialog";

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
}: {
  rota: RotaController;
  overlays: RotaOverlaysState;
  onPublishConfirm: (prepareStaffUpdate: boolean) => void;
  onApplySuggestions: () => void;
  onMarkShiftOpen: (shiftId: ShiftId) => void;
}) {
  const { openOverlays, setOverlay } = overlays;
  const workingTimeAlertCount = rota.workingTimeAlertList.length;

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
        staff={rota.staff}
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
        onConfirm={onPublishConfirm}
      />
      <GenerateRotaDialog
        open={openOverlays.generate}
        onOpenChange={(open) => setOverlay("generate", open)}
        weekLabel={rota.weekLabel}
        days={rota.days}
        shifts={rota.draftShifts}
        staff={rota.staff}
        onApplySuggestions={onApplySuggestions}
      />
      <RotaFiltersDrawer
        open={openOverlays.filters}
        onOpenChange={(open) => setOverlay("filters", open)}
        filters={rota.filters}
        roleOptions={rota.roleOptions}
        onFiltersChange={rota.setFilters}
      />
      <TemplatesDialog
        open={openOverlays.templates}
        onOpenChange={(open) => setOverlay("templates", open)}
        onApplyStandardTemplate={rota.requestApplyStandardTemplate}
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
        days={rota.days}
        onClose={rota.closeShiftDetail}
        onUpdate={rota.updateShift}
        onRemove={rota.requestRemoveShift}
        onMarkOpen={onMarkShiftOpen}
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
