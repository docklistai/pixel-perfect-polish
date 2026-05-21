import { CircleAlert, Send } from "lucide-react";
import { ActionButton } from "@/components/dl";

export function RotaStatusBanner({
  published,
  hasUnpublishedChanges,
  publishState,
  openShiftCount,
  conflictCount,
  workingTimeAlertCount,
  coveragePct,
  onPublish,
}: {
  published: boolean;
  hasUnpublishedChanges: boolean;
  publishState: "draft" | "unpublished-changes" | "ready" | "published" | "published-issues";
  openShiftCount: number;
  conflictCount: number;
  workingTimeAlertCount: number;
  coveragePct: number;
  onPublish: () => void;
}) {
  const isClean = publishState === "published" || publishState === "ready";
  const tone = isClean ? "success" : "warning";
  const issueSummary = `${openShiftCount} open shift${openShiftCount === 1 ? "" : "s"} · ${conflictCount} conflict${conflictCount === 1 ? "" : "s"} · ${workingTimeAlertCount} working time alert${workingTimeAlertCount === 1 ? "" : "s"}`;
  const title =
    publishState === "published"
      ? "Published rota"
      : publishState === "published-issues"
        ? "Published with issues"
        : publishState === "unpublished-changes"
          ? "Unpublished changes"
          : publishState === "ready"
            ? "Ready to publish"
            : "Draft rota";
  const body =
    publishState === "published"
      ? "Staff should only see this published version."
      : publishState === "published-issues"
        ? `${issueSummary}. Staff should only see this published version; keep reviewing the remaining issues.`
        : publishState === "unpublished-changes"
          ? `${issueSummary}. Publish updates when the changed draft is ready for staff.`
          : publishState === "ready"
            ? "No open shifts or conflicts remain. Publish when this rota is ready for staff."
            : `${issueSummary}. Review issues before publishing, or publish with acknowledgement if the rota is ready for staff.`;
  const canPublish = !published || hasUnpublishedChanges;
  const cta = canPublish
    ? published && hasUnpublishedChanges
      ? "Publish updates"
      : "Publish rota"
    : publishState === "published-issues"
      ? "Published with issues"
      : "Published";

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
            <div className="mt-1 text-xs text-muted-foreground">
              Scheduled hours are {coveragePct}% of weekly target.
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
          <ActionButton size="sm" icon={Send} onClick={onPublish} disabled={!canPublish}>
            {cta}
          </ActionButton>
        </div>
      </div>
    </div>
  );
}
