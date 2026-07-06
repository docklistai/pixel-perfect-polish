import { Eye, EyeOff } from "lucide-react";
import type { useRotaDraftController } from "../hooks/useRotaDraftController";
import type { PublishState } from "../lib/publishEligibility";
import type { ShiftId } from "../types";
import { IssuesToResolveCard } from "./IssuesToResolveCard";
import { LabourSummaryCard } from "./LabourSummaryCard";
import { PublishReadinessCard } from "./PublishReadinessCard";

type RotaController = ReturnType<typeof useRotaDraftController>;

/**
 * Insights rail beside the rota grid: labour, issues, and publish readiness.
 * The route keeps the visibility state because it also drives the grid layout
 * class; this component only renders the column and its show/hide toggle.
 */
export function RotaInsightsColumn({
  rota,
  visible,
  onVisibleChange,
  publishState,
  leaveDataState,
  readOnly,
  canPublish,
  onPublish,
  onViewCoverageDetails,
  onOpenSupport,
  onChooseRecoveryCandidate,
}: {
  rota: RotaController;
  visible: boolean;
  onVisibleChange: (visible: boolean) => void;
  publishState: PublishState;
  leaveDataState: "ready" | "loading" | "error";
  readOnly: boolean;
  canPublish: boolean;
  onPublish: () => void;
  onViewCoverageDetails: () => void;
  onOpenSupport: () => void;
  onChooseRecoveryCandidate: (shiftId: ShiftId, staffId: string) => void;
}) {
  if (!visible) {
    return (
      <div className="flex justify-center xl:justify-end">
        <button
          type="button"
          onClick={() => onVisibleChange(true)}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <Eye className="h-3.5 w-3.5" aria-hidden />
          Show insights
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end mb-[-4px]">
        <button
          type="button"
          onClick={() => onVisibleChange(false)}
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
        onViewCoverageDetails={onViewCoverageDetails}
      />
      <IssuesToResolveCard
        conflicts={rota.conflictSummaries}
        workingTimeAlerts={rota.workingTimeAlertList}
        onReviewShift={rota.setSelectedShiftId}
        onOpenSupport={onOpenSupport}
        draftShifts={rota.draftShifts}
        assignableStaff={rota.assignableStaff}
        leaveRequests={rota.leaveRequests}
        dayIsoDates={rota.dayIsoDates}
        onChooseRecoveryCandidate={onChooseRecoveryCandidate}
      />
      <PublishReadinessCard
        published={rota.published}
        hasUnpublishedChanges={rota.hasUnpublishedChanges}
        publishState={publishState}
        conflictCount={rota.conflictCount}
        openShiftCount={rota.openShiftCount}
        workingTimeAlertCount={rota.workingTimeAlertList.length}
        leaveDataState={leaveDataState}
        assignedShiftCount={rota.assignedShiftCount}
        plannedShiftCount={rota.plannedShiftCount}
        coveragePct={rota.coveragePct}
        readOnly={readOnly || rota.liveMutationPending || rota.liveMutationFailed}
        canPublish={canPublish}
        onPublish={onPublish}
      />
    </div>
  );
}
