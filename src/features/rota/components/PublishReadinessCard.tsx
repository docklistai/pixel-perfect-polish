import { Send, CheckCircle2, AlertTriangle } from "lucide-react";
import { Card, StatusBadge, ActionButton } from "@/components/dl";
import { type PublishState, publishStateLabel } from "../lib/publishEligibility";

export function PublishReadinessCard({
  published,
  hasUnpublishedChanges,
  publishState,
  conflictCount,
  openShiftCount,
  workingTimeAlertCount,
  leaveDataState,
  constraintClashCount,
  availabilityDataState,
  assignedShiftCount,
  plannedShiftCount,
  readOnly,
  canPublish,
  onPublish,
}: {
  published: boolean;
  hasUnpublishedChanges: boolean;
  publishState: PublishState;
  conflictCount: number;
  openShiftCount: number;
  workingTimeAlertCount: number;
  leaveDataState: "ready" | "loading" | "error";
  constraintClashCount: number;
  availabilityDataState: "ready" | "loading" | "error";
  assignedShiftCount: number;
  plannedShiftCount: number;
  readOnly: boolean;
  canPublish: boolean;
  onPublish: () => void;
}) {
  const checks = [
    {
      k: "Shift assignment",
      v:
        plannedShiftCount === 0
          ? "No shifts planned"
          : `${assignedShiftCount} of ${plannedShiftCount} assigned · ${openShiftCount} open`,
      ok: plannedShiftCount === 0 || assignedShiftCount === plannedShiftCount,
    },
    {
      k: "Conflicts resolved",
      v: conflictCount === 0 ? "All clear" : `${conflictCount} remain`,
      ok: conflictCount === 0,
    },
    {
      k: "Open shifts",
      v: openShiftCount === 0 ? "None" : `${openShiftCount} open`,
      ok: true,
    },
    {
      k: "Working time checked",
      v:
        workingTimeAlertCount === 0
          ? "Clear"
          : `${workingTimeAlertCount} alert${workingTimeAlertCount === 1 ? "" : "s"}`,
      ok: workingTimeAlertCount === 0,
    },
    {
      k: "Leave data",
      v:
        leaveDataState === "ready"
          ? "Checked"
          : leaveDataState === "loading"
            ? "Loading"
            : "Unavailable",
      ok: leaveDataState === "ready",
    },
    {
      k: "Availability constraints",
      v:
        availabilityDataState !== "ready"
          ? availabilityDataState === "loading"
            ? "Loading"
            : "Unavailable"
          : constraintClashCount === 0
            ? "No overrides"
            : constraintClashCount + " override" + (constraintClashCount === 1 ? "" : "s"),
      ok: availabilityDataState === "ready" && constraintClashCount === 0,
    },
  ];

  const badgeTone =
    publishState === "published" || publishState === "ready" ? "success" : "warning";
  const badgeLabel = readOnly ? "Read-only" : publishStateLabel(publishState);
  const buttonLabel = !canPublish
    ? readOnly
      ? "Publish unavailable"
      : published && !hasUnpublishedChanges
        ? "Published"
        : "Publish unavailable"
    : plannedShiftCount === 0
      ? "Publish empty week"
      : conflictCount > 0 ||
          workingTimeAlertCount > 0 ||
          leaveDataState !== "ready" ||
          availabilityDataState !== "ready" ||
          constraintClashCount > 0
        ? "Publish with issues"
        : "Publish to staff";

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-semibold">Publish readiness</div>
        <StatusBadge tone={badgeTone}>{badgeLabel}</StatusBadge>
      </div>
      <div className="space-y-2">
        {checks.map(({ k, v, ok }) => (
          <div key={k} className="flex items-center gap-2 text-sm">
            {ok ? (
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success" aria-hidden />
            ) : (
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-warning" aria-hidden />
            )}
            <span className="flex-1 text-foreground">{k}</span>
            <span className={ok ? "text-success font-medium" : "text-muted-foreground"}>{v}</span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Staff see only the published rota. Publish with issues only when the team is ready for this
        version.
      </p>
      {leaveDataState !== "ready" && (
        <p className="mt-2 text-xs text-warning">
          Approved leave checks are incomplete while leave data is{" "}
          {leaveDataState === "loading" ? "loading" : "unavailable"}.
        </p>
      )}
      {availabilityDataState !== "ready" && (
        <p className="mt-2 text-xs text-warning">
          Approved availability checks are{" "}
          {availabilityDataState === "loading" ? "loading" : "unavailable"}.
        </p>
      )}
      <ActionButton
        className="mt-4 w-full"
        icon={Send}
        onClick={() => canPublish && onPublish()}
        disabled={!canPublish}
      >
        {buttonLabel}
      </ActionButton>
    </Card>
  );
}
