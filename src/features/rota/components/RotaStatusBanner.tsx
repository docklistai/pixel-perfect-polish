import * as React from "react";
import {
  Bell,
  CheckCircle2,
  ChevronDown,
  Copy,
  FileDown,
  Info,
  Link2,
  Pencil,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { ActionButton, StatusBadge } from "@/components/dl";
import { RowActionMenu } from "@/components/RowActionMenu";
import { WhoSeenDrawer } from "./WhoSeenDrawer";
import type { StaffMember } from "../types";

export function RotaStatusBanner({
  published,
  hasUnpublishedChanges,
  publishState,
  openShiftCount,
  conflictCount,
  workingTimeAlertCount,
  coveragePct,
  weekLabel,
  staff,
  readOnly,
  onPublish,
  onCopyLastWeek,
  onViewConflicts,
}: {
  published: boolean;
  hasUnpublishedChanges: boolean;
  publishState: "draft" | "unpublished-changes" | "ready" | "published" | "published-issues";
  openShiftCount: number;
  conflictCount: number;
  workingTimeAlertCount: number;
  coveragePct: number;
  weekLabel: string;
  staff: StaffMember[];
  readOnly: boolean;
  onPublish: () => void;
  onCopyLastWeek: () => void;
  onViewConflicts: () => void;
}) {
  const [whoSeenOpen, setWhoSeenOpen] = React.useState(false);
  const isPublishedClean = published && !hasUnpublishedChanges;
  const canPublish = !readOnly && (!published || hasUnpublishedChanges);

  if (isPublishedClean) {
    const viewedCount = Math.max(1, staff.length - 2);
    return (
      <div className="mb-4 rounded-[18px] border border-success/20 bg-success-soft/30 px-5 py-4 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-success-soft text-success">
              <CheckCircle2 className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-foreground">
                Published — staff can see this rota
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {readOnly
                  ? "Viewing the saved live rota. Editing and publishing aren't available yet."
                  : `${viewedCount} of ${staff.length} have already viewed the snapshot${
                      publishState === "published-issues"
                        ? ` · ${openShiftCount + conflictCount + workingTimeAlertCount} issues remain open`
                        : ""
                    }.`}
              </div>
            </div>
          </div>
          {!readOnly && (
            <div className="flex flex-wrap items-center gap-2">
              <ActionButton variant="ghost" size="sm" onClick={() => setWhoSeenOpen(true)}>
                Who's seen this
              </ActionButton>
              <ActionButton
                variant="secondary"
                size="sm"
                icon={Bell}
                onClick={() =>
                  toast.info("Reminder prepared", {
                    description:
                      "Non-viewers will see a reminder in the app the next time they open it.",
                  })
                }
              >
                Remind non-viewers
              </ActionButton>
            </div>
          )}
        </div>
        <WhoSeenDrawer
          open={whoSeenOpen}
          onOpenChange={setWhoSeenOpen}
          weekLabel={weekLabel}
          staff={staff}
        />
      </div>
    );
  }

  return (
    <div className="mb-4 rounded-[18px] border border-warning/25 bg-gradient-to-r from-warning-soft/80 via-warning-soft/40 to-transparent px-5 py-4 shadow-[var(--shadow-card)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-warning-soft text-warning">
            <Pencil className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-foreground">
              {published
                ? "Unpublished changes — staff still see the last published rota"
                : "Draft — not yet visible to staff"}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {conflictCount > 0 ? (
                <button
                  type="button"
                  onClick={onViewConflicts}
                  title="View all conflicts"
                  className="inline-flex"
                >
                  <StatusBadge tone="danger" dot>
                    {conflictCount} conflict{conflictCount === 1 ? "" : "s"} to resolve
                  </StatusBadge>
                </button>
              ) : (
                <StatusBadge tone="success" dot>
                  No conflicts
                </StatusBadge>
              )}
              <StatusBadge tone={openShiftCount > 0 ? "warning" : "muted"} dot>
                {openShiftCount} open shift{openShiftCount === 1 ? "" : "s"}
              </StatusBadge>
              <StatusBadge tone={workingTimeAlertCount > 0 ? "purple" : "muted"} dot>
                {workingTimeAlertCount} working time alert{workingTimeAlertCount === 1 ? "" : "s"}
              </StatusBadge>
              <StatusBadge tone="brand" dot>
                {coveragePct}% coverage
              </StatusBadge>
            </div>
            <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Info className="h-3 w-3 shrink-0" aria-hidden />
              Review warnings before publishing
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <RowActionMenu
            triggerLabel="More draft actions"
            trigger={
              <button type="button" className="btn ghost sm">
                More
                <ChevronDown className="h-3.5 w-3.5" aria-hidden />
              </button>
            }
            items={[
              {
                label: "Share read-only draft link",
                icon: Link2,
                onSelect: () =>
                  toast.info("Draft link copied", {
                    description: "Read-only link on clipboard — not visible to staff.",
                  }),
              },
              {
                label: "Export as PDF",
                icon: FileDown,
                onSelect: () => window.print(),
              },
              {
                label: "Copy last week's pattern",
                icon: Copy,
                onSelect: onCopyLastWeek,
              },
            ]}
          />
          <ActionButton size="sm" icon={Send} onClick={onPublish} disabled={!canPublish}>
            Publish to staff
          </ActionButton>
        </div>
      </div>
    </div>
  );
}
