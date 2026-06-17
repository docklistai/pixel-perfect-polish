import { CircleAlert, ExternalLink, Lightbulb, TrendingUp } from "lucide-react";
import { ActionButton, DrawerShell, StatusBadge } from "@/components/dl";
import type { RotaIssue } from "../lib/rotaIssues";
import type { ShiftId } from "../types";

/** Drawer with Problem / Suggested fix / Impact rows for a rota issue (prototype "View fix & actions"). */
export function IssueDetailDrawer({
  issue,
  reviewed,
  onClose,
  onMarkReviewed,
  onReviewShift,
}: {
  issue: RotaIssue | null;
  reviewed: boolean;
  onClose: () => void;
  onMarkReviewed: (issue: RotaIssue) => void;
  onReviewShift: (shiftId: ShiftId) => void;
}) {
  const sections = issue
    ? [
        {
          label: "Problem",
          icon: CircleAlert,
          bubble: "bg-danger-soft text-danger",
          body: issue.why,
        },
        {
          label: "Suggested fix",
          icon: Lightbulb,
          bubble: "bg-brand-soft text-brand",
          body: issue.fix,
        },
        {
          label: "Impact",
          icon: TrendingUp,
          bubble: "bg-info-soft text-info",
          body: issue.impact,
        },
      ]
    : [];

  return (
    <DrawerShell
      open={issue !== null}
      onOpenChange={(open) => !open && onClose()}
      title={issue?.title ?? ""}
      description="Source: Rota draft · this week"
      meta={
        issue && (
          <StatusBadge tone={reviewed ? "muted" : issue.tone === "danger" ? "danger" : "warning"}>
            {reviewed ? "Reviewed" : "Needs attention"}
          </StatusBadge>
        )
      }
      footer={
        issue && (
          <>
            <ActionButton variant="ghost" size="sm" onClick={onClose}>
              Close
            </ActionButton>
            <ActionButton variant="secondary" size="sm" onClick={() => onMarkReviewed(issue)}>
              Mark reviewed
            </ActionButton>
          </>
        )
      }
    >
      {issue && (
        <div className="space-y-3">
          {sections.map((section) => (
            <div
              key={section.label}
              className="flex items-start gap-3 rounded-[10px] border border-border bg-muted/30 px-3.5 py-3"
            >
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${section.bubble}`}
                aria-hidden
              >
                <section.icon className="h-3 w-3" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {section.label}
                </div>
                <div className="mt-1 text-sm leading-relaxed">{section.body}</div>
              </div>
            </div>
          ))}

          <div className="pt-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Actions
          </div>
          <div className="space-y-2">
            {issue.shiftId && (
              <ActionButton
                variant="secondary"
                size="sm"
                icon={ExternalLink}
                className="w-full justify-start"
                onClick={() => onReviewShift(issue.shiftId!)}
              >
                Open affected shift
              </ActionButton>
            )}
          </div>
        </div>
      )}
    </DrawerShell>
  );
}
