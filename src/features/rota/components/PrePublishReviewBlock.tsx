import { AlertTriangle, CircleAlert, type LucideIcon } from "lucide-react";
import { StatusBadge, type Tone } from "@/components/dl";
import { ReasoningRow, ReviewBlock } from "@/features/ai/components";

type Blocker = {
  id: string;
  icon: LucideIcon;
  tone: Tone;
  title: string;
  reason: string;
  actionLabel: string;
  onAction: () => void;
};

interface PrePublishReviewBlockProps {
  openShiftCount: number;
  conflictCount: number;
  workingTimeAlertCount: number;
  plannedShiftCount: number;
  onReviewOpenShifts: () => void;
  onReviewConflicts: () => void;
  onReviewWorkingTime: () => void;
}

const TITLE = "Pre-publish review";

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

function joinPhrases(phrases: string[]): string {
  if (phrases.length === 1) return phrases[0];
  return `${phrases.slice(0, -1).join(", ")} and ${phrases[phrases.length - 1]}`;
}

/**
 * Rota right-rail block that summarises what a manager should review before
 * publishing. Deterministic: it reads existing rota readiness counts and
 * routes into existing drawers. It never publishes or mutates rota data.
 */
export function PrePublishReviewBlock({
  openShiftCount,
  conflictCount,
  workingTimeAlertCount,
  plannedShiftCount,
  onReviewOpenShifts,
  onReviewConflicts,
  onReviewWorkingTime,
}: PrePublishReviewBlockProps) {
  if (plannedShiftCount === 0) {
    return (
      <ReviewBlock
        title={TITLE}
        verdict="No shifts planned for this week."
        badge={<StatusBadge tone="muted">No shifts</StatusBadge>}
      />
    );
  }

  const blockers: Blocker[] = [];
  if (openShiftCount > 0) {
    blockers.push({
      id: "open-shifts",
      icon: AlertTriangle,
      tone: "warning",
      title: plural(openShiftCount, "open shift"),
      reason: "These shifts have no staff assigned. Assign cover so the team knows who is working.",
      actionLabel: "Add shift",
      onAction: onReviewOpenShifts,
    });
  }
  if (conflictCount > 0) {
    blockers.push({
      id: "conflicts",
      icon: CircleAlert,
      tone: "danger",
      title: plural(conflictCount, "conflict"),
      reason:
        "Some staff are double-booked or have overlapping shifts. Resolve these so the rota is accurate.",
      actionLabel: "Review",
      onAction: onReviewConflicts,
    });
  }
  if (workingTimeAlertCount > 0) {
    blockers.push({
      id: "working-time",
      icon: AlertTriangle,
      tone: "warning",
      title: plural(workingTimeAlertCount, "working-time alert"),
      reason:
        "Some staff are scheduled beyond their planned hours this week. Check these before publishing.",
      actionLabel: "Review",
      onAction: onReviewWorkingTime,
    });
  }

  if (blockers.length === 0) {
    return (
      <ReviewBlock
        title={TITLE}
        verdict="No blockers found. Review the checklist below before publishing."
        badge={<StatusBadge tone="success">Clear</StatusBadge>}
      />
    );
  }

  return (
    <ReviewBlock
      title={TITLE}
      verdict={`${joinPhrases(blockers.map((b) => b.title))} remain. Review these before publishing.`}
      badge={<StatusBadge tone="warning">{plural(blockers.length, "item")} to review</StatusBadge>}
    >
      <ul role="list" className="space-y-2.5">
        {blockers.map((blocker) => (
          <ReasoningRow
            key={blocker.id}
            icon={blocker.icon}
            tone={blocker.tone}
            title={blocker.title}
            reason={blocker.reason}
            actionLabel={blocker.actionLabel}
            onAction={blocker.onAction}
          />
        ))}
      </ul>
    </ReviewBlock>
  );
}
