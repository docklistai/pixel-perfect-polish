import { CircleAlert, Send } from "lucide-react";
import { ActionButton } from "@/components/dl";

export function RotaStatusBanner({
  published,
  hasUnpublishedChanges,
  openShiftCount,
  conflictCount,
  coveragePct,
  onPublish,
}: {
  published: boolean;
  hasUnpublishedChanges: boolean;
  openShiftCount: number;
  conflictCount: number;
  coveragePct: number;
  onPublish: () => void;
}) {
  const isClean = published && !hasUnpublishedChanges;
  const tone = isClean ? "success" : "warning";
  const title = !published
    ? "Draft rota · changes stay local until you publish"
    : hasUnpublishedChanges
      ? "Published rota · local draft changes waiting to republish"
      : "Published rota · staff see the last published snapshot";
  const body = !published
    ? `${openShiftCount} open shifts · ${conflictCount} conflicts · ${coveragePct}% coverage. Staff do not see these draft changes yet.`
    : hasUnpublishedChanges
      ? `${openShiftCount} open shifts · ${conflictCount} conflicts · ${coveragePct}% coverage. Republish to update the staff snapshot they will see later.`
      : "Staff see the last published snapshot. Draft changes remain local until you republish.";
  const cta = !published ? "Publish to staff" : "Republish to staff";

  return (
    <div
      className={`mb-4 rounded-[18px] border px-5 py-4 shadow-[var(--shadow-card)] ${
        isClean ? "border-success/20 bg-success-soft/30" : "border-warning/20 bg-warning-soft"
      }`}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] ${
              isClean ? "bg-success-soft text-success" : "bg-warning-soft text-warning"
            }`}
          >
            <CircleAlert className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-foreground">{title}</div>
            <div className="mt-1 text-sm text-muted-foreground">{body}</div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
          <ActionButton size="sm" icon={Send} onClick={onPublish}>
            {cta}
          </ActionButton>
        </div>
      </div>
    </div>
  );
}
