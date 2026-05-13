import { CircleAlert, Share2, Download, Send } from "lucide-react";
import { ActionButton } from "@/components/dl";

export function RotaStatusBanner({
  published,
  openShiftCount,
  conflictCount,
  onPublish,
}: {
  published: boolean;
  openShiftCount: number;
  conflictCount: number;
  onPublish: () => void;
}) {
  return (
    <div
      className={`mb-4 rounded-[18px] border px-5 py-4 shadow-[var(--shadow-card)] ${
        published ? "border-success/20 bg-success-soft/30" : "border-warning/20 bg-warning-soft"
      }`}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] ${
              published ? "bg-success-soft text-success" : "bg-warning-soft text-warning"
            }`}
          >
            <CircleAlert className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-foreground">
              {published
                ? "Published rota · staff can see this snapshot"
                : "Draft rota · not yet shared with staff"}
            </div>
            <div className="mt-1 text-sm text-muted-foreground">
              {published
                ? "Latest changes are visible to staff. Use republish to push updates."
                : `${openShiftCount} open shifts · ${conflictCount} conflicts · 98% coverage. Resolve the warnings to publish.`}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
          <ActionButton variant="secondary" size="sm" icon={Share2} disabled>
            {published ? "Share published link" : "Share draft link"}
          </ActionButton>
          <ActionButton variant="secondary" size="sm" icon={Download} disabled>
            Export PDF
          </ActionButton>
          <ActionButton size="sm" icon={Send} onClick={onPublish}>
            {published ? "Republish to staff" : "Publish to staff"}
          </ActionButton>
        </div>
      </div>
    </div>
  );
}
