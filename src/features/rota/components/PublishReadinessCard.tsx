import { Send } from "lucide-react";
import { Card, StatusBadge, ActionButton } from "@/components/dl";

export function PublishReadinessCard({
  published,
  hasUnpublishedChanges,
  conflictCount,
  assignedShiftCount,
  plannedShiftCount,
  coveragePct,
  onPublish,
}: {
  published: boolean;
  hasUnpublishedChanges: boolean;
  conflictCount: number;
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
      v: conflictCount === 0 ? "All" : `0 / ${conflictCount}`,
      ok: conflictCount === 0,
    },
  ];

  const isClean = published && !hasUnpublishedChanges;
  const badgeTone = isClean ? "success" : "warning";
  const badgeLabel = !published ? "Draft" : hasUnpublishedChanges ? "Draft changes" : "Published";
  const buttonLabel = !published
    ? "Publish to staff"
    : hasUnpublishedChanges
      ? "Republish to staff"
      : "Published";

  return (
    <Card className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm font-semibold">Publish readiness</div>
        <StatusBadge tone={badgeTone}>{badgeLabel}</StatusBadge>
      </div>
      <div className="space-y-2">
        {checks.map(({ k, v, ok }) => (
          <div key={k} className="flex items-center justify-between gap-4 text-sm">
            <span className="flex items-center gap-2 text-foreground">
              <span className={ok ? "text-success" : "text-danger"}>{ok ? "✓" : "✗"}</span>
              {k}
            </span>
            <span className="text-muted-foreground">{v}</span>
          </div>
        ))}
      </div>
      <ActionButton
        className="mt-4 w-full"
        icon={Send}
        onClick={() => (!published || hasUnpublishedChanges) && onPublish()}
        disabled={isClean}
      >
        {buttonLabel}
      </ActionButton>
    </Card>
  );
}
