import * as React from "react";
import { AlertTriangle, Check, ChevronRight, CircleAlert, History, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { ActionButton, Card } from "@/components/dl";
import { AiChip } from "@/components/ai/AiChip";
import { buildRotaIssues, type IssueTone, type RotaIssue } from "../lib/rotaIssues";
import { IssueDetailDrawer } from "./IssueDetailDrawer";
import type { ConflictSummary, ShiftId, WorkingTimeAlert } from "../types";

const toneCardClasses: Record<IssueTone, string> = {
  danger: "border-danger/25 bg-danger-soft/60",
  warning: "border-warning/25 bg-warning-soft/60",
};

const toneBubbleClasses: Record<IssueTone, string> = {
  danger: "bg-danger-soft text-danger",
  warning: "bg-warning-soft text-warning",
};

const toneTitleClasses: Record<IssueTone, string> = {
  danger: "text-danger",
  warning: "text-warning-700",
};

export function IssuesToResolveCard({
  conflicts,
  workingTimeAlerts,
  onReviewShift,
  onOpenSupport,
}: {
  conflicts: ConflictSummary[];
  workingTimeAlerts: WorkingTimeAlert[];
  onReviewShift: (shiftId: ShiftId) => void;
  onOpenSupport: () => void;
}) {
  const [reviewed, setReviewed] = React.useState<Record<string, boolean>>({});
  const [openIssueId, setOpenIssueId] = React.useState<string | null>(null);

  const issues = React.useMemo(
    () => buildRotaIssues(conflicts, workingTimeAlerts),
    [conflicts, workingTimeAlerts],
  );
  const openIssue = issues.find((issue) => issue.id === openIssueId) ?? null;

  const toggleReviewed = (issue: RotaIssue) => {
    const isDone = !!reviewed[issue.id];
    setReviewed((prev) => ({ ...prev, [issue.id]: !isDone }));
    if (isDone) {
      toast.info("Reopened", { description: issue.title });
    } else {
      toast.success("Marked reviewed", { description: issue.title });
    }
  };

  return (
    <Card className="p-4">
      <div className="mb-1 flex items-center justify-between gap-2">
        <div className="text-sm font-semibold">Issues to resolve</div>
        <AiChip size="sm" label="Rota review" />
      </div>
      <div className="mb-3 text-xs text-muted-foreground">
        Resolve before publishing · from this week's rota draft
      </div>

      {issues.length === 0 ? (
        <div className="flex items-center gap-2 rounded-[10px] border border-success/25 bg-success-soft/50 px-3 py-2.5 text-xs font-medium text-success">
          <Check className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Nothing blocking publish this week.
        </div>
      ) : (
        <div className="space-y-2">
          {issues.map((issue) => {
            const done = !!reviewed[issue.id];
            return (
              <div
                key={issue.id}
                className={`rounded-[10px] border px-3 py-2.5 transition-opacity ${
                  done ? "border-border bg-muted/40 opacity-60" : toneCardClasses[issue.tone]
                }`}
              >
                <div className="flex items-start gap-2">
                  <span
                    className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full ${
                      done ? "bg-muted text-muted-foreground" : toneBubbleClasses[issue.tone]
                    }`}
                    aria-hidden
                  >
                    {done ? (
                      <Check className="h-2.5 w-2.5" />
                    ) : issue.tone === "danger" ? (
                      <CircleAlert className="h-2.5 w-2.5" />
                    ) : (
                      <AlertTriangle className="h-2.5 w-2.5" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div
                      className={`text-[11.5px] font-semibold leading-snug ${
                        done ? "text-muted-foreground line-through" : toneTitleClasses[issue.tone]
                      }`}
                    >
                      {issue.title}
                    </div>
                    <div className="mt-1 text-[11px] leading-snug text-muted-foreground">
                      {issue.why.split(".")[0]}.
                    </div>
                    {!done && (
                      <button
                        type="button"
                        className="mt-1 inline-flex items-center gap-0.5 text-[11px] font-semibold text-brand hover:underline"
                        onClick={() => setOpenIssueId(issue.id)}
                      >
                        View fix &amp; actions
                        <ChevronRight className="h-2.5 w-2.5" aria-hidden />
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-md text-muted-foreground transition hover:bg-background/60 hover:text-foreground"
                    title={done ? "Reopen" : "Mark reviewed"}
                    aria-label={done ? `Reopen: ${issue.title}` : `Mark reviewed: ${issue.title}`}
                    onClick={() => toggleReviewed(issue)}
                  >
                    {done ? (
                      <History className="h-3 w-3" aria-hidden />
                    ) : (
                      <Check className="h-3 w-3" aria-hidden />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ActionButton
        variant="outline"
        size="sm"
        icon={Sparkles}
        className="mt-3 w-full justify-center"
        onClick={onOpenSupport}
      >
        Open manager support
      </ActionButton>

      <IssueDetailDrawer
        issue={openIssue}
        reviewed={openIssue ? !!reviewed[openIssue.id] : false}
        onClose={() => setOpenIssueId(null)}
        onMarkReviewed={(issue) => {
          setReviewed((prev) => ({ ...prev, [issue.id]: true }));
          setOpenIssueId(null);
          toast.info("Marked reviewed", { description: issue.title });
        }}
        onReviewShift={(shiftId) => {
          setOpenIssueId(null);
          onReviewShift(shiftId);
        }}
      />
    </Card>
  );
}
