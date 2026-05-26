import { CircleAlert, FileDown, Send, Share2 } from "lucide-react";
import { toast } from "sonner";
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
  const title =
    publishState === "published"
      ? "Published rota"
      : publishState === "published-issues"
        ? "Published with issues"
        : "Draft rota";
  const summary = `${openShiftCount} open shift${openShiftCount === 1 ? "" : "s"} · ${conflictCount} conflict${conflictCount === 1 ? "" : "s"} · ${workingTimeAlertCount} working time alert${workingTimeAlertCount === 1 ? "" : "s"} · ${coveragePct}% coverage`;
  const body =
    publishState === "published"
      ? "Staff see only the published rota."
      : "Not yet shared with staff. Resolve issues before publishing, or publish with acknowledgement if the team is ready.";
  const canPublish = !published || hasUnpublishedChanges;
  const publishLabel =
    published && !hasUnpublishedChanges
      ? publishState === "published-issues"
        ? "Published with issues"
        : "Published"
      : "Publish to staff";

  return (
    <div
      className={`mb-4 rounded-[18px] border px-5 py-4 shadow-[var(--shadow-card)] ${
        isClean
          ? "border-success/20 bg-success-soft/30"
          : "border-warning/25 bg-gradient-to-r from-warning-soft/80 via-warning-soft/40 to-transparent"
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
            <div className="mt-1 text-sm text-muted-foreground">{summary}</div>
            <div className="mt-1 text-xs text-muted-foreground">{body}</div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
          <ActionButton
            variant="secondary"
            size="sm"
            icon={Share2}
            onClick={() =>
              toast.info("Share draft", {
                description: "Sharing is not wired in this prototype.",
              })
            }
          >
            Share draft
          </ActionButton>
          <ActionButton variant="outline" size="sm" icon={FileDown} onClick={() => window.print()}>
            Export PDF
          </ActionButton>
          <ActionButton size="sm" icon={Send} onClick={onPublish} disabled={!canPublish}>
            {publishLabel}
          </ActionButton>
        </div>
      </div>
    </div>
  );
}
