import { Send, CheckCircle2, AlertTriangle } from "lucide-react";
import { Card, StatusBadge, ActionButton } from "@/components/dl";

export function PublishReadinessCard({
  published,
  hasUnpublishedChanges,
  publishState,
  conflictCount,
  openShiftCount,
  workingTimeAlertCount,
  assignedShiftCount,
  plannedShiftCount,
  coveragePct,
  onPublish,
}: {
  published: boolean;
  hasUnpublishedChanges: boolean;
  publishState: "draft" | "unpublished-changes" | "ready" | "published" | "published-issues";
  conflictCount: number;
  openShiftCount: number;
  workingTimeAlertCount: number;
  assignedShiftCount: number;
  plannedShiftCount: number;
  coveragePct: number;
  onPublish: () => void;
}) {
  const checks = [
    {
      k: "Shifts assigned",
      v: `${assignedShiftCount} / ${plannedShiftCount}`,
      ok: plannedShiftCount > 0 && assignedShiftCount === plannedShiftCount,
    },
    {
      k: "Coverage target",
      v: `${coveragePct}%`,
      ok: coveragePct >= 95,
    },
    {
      k: "Conflicts resolved",
      v: conflictCount === 0 ? "All clear" : `${conflictCount} remain`,
      ok: conflictCount === 0,
    },
    {
      k: "Working time checked",
      v:
        workingTimeAlertCount === 0
          ? "Clear"
          : `${workingTimeAlertCount} alert${workingTimeAlertCount === 1 ? "" : "s"}`,
      ok: workingTimeAlertCount === 0,
    },
  ];

  const badgeTone =
    publishState === "published" || publishState === "ready" ? "success" : "warning";
  const badgeLabel =
    publishState === "published"
      ? "Published"
      : publishState === "published-issues"
        ? "Published with issues"
        : publishState === "unpublished-changes"
          ? "Unpublished changes"
          : publishState === "ready"
            ? "Ready"
            : "Draft";
  const buttonLabel =
    published && !hasUnpublishedChanges
      ? publishState === "published-issues"
        ? "Published with issues"
        : "Published"
      : openShiftCount > 0 || conflictCount > 0 || workingTimeAlertCount > 0
        ? "Publish with issues"
        : "Publish rota";
  const canPublish = !published || hasUnpublishedChanges;

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
