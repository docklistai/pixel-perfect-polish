import { Eye, EyeOff } from "lucide-react";
import { useRotaInsights } from "../hooks/useRotaInsights";
import type { useRotaDraftController } from "../hooks/useRotaDraftController";
import type { RecurringDayOffClash } from "../lib/recurringDayOffClashes";
import type { PublishState } from "../lib/publishEligibility";
import type { ShiftId } from "../types";
import { IssuesToResolveCard } from "./IssuesToResolveCard";
import { LabourSummaryCard } from "./LabourSummaryCard";
import { DailyBudgetCard } from "./DailyBudgetCard";
import { RoleBudgetCard } from "./RoleBudgetCard";
import { PublishReadinessCard } from "./PublishReadinessCard";
import { RecurringDayOffClashesCard } from "./RecurringDayOffClashesCard";
import { ClosedDayShiftsCard } from "./ClosedDayShiftsCard";
import { OutsideHoursCard } from "./OutsideHoursCard";

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
  dayOffClashes,
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
  dayOffClashes: RecurringDayOffClash[];
}) {
  const insights = useRotaInsights({
    source: rota.source,
    draftShifts: rota.draftShifts,
    scheduledHours: rota.scheduledHours,
    days: rota.days,
    dayIsoDates: rota.dayIsoDates,
  });

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
        source={rota.source}
        scheduledHours={rota.scheduledHours}
        contractedHours={rota.targetHours}
        coveragePct={rota.coveragePct}
        labour={insights.labour}
        onViewCoverageDetails={onViewCoverageDetails}
      />
      {insights.dailyBudget && <DailyBudgetCard view={insights.dailyBudget} />}
      {insights.roleBudget && <RoleBudgetCard view={insights.roleBudget} />}
      <ClosedDayShiftsCard
        shifts={insights.closedDayShifts}
        onReviewShift={rota.setSelectedShiftId}
      />
      <OutsideHoursCard
        shifts={insights.outsideHoursShifts}
        onReviewShift={rota.setSelectedShiftId}
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
      <RecurringDayOffClashesCard clashes={dayOffClashes} onReviewShift={rota.setSelectedShiftId} />
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
