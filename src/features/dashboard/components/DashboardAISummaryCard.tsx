import { Calendar, Clock3, Sparkles } from "lucide-react";
import { AiSuggestionCard } from "@/components/ai/AiSuggestionCard";
import {
  dashboardAttentionSummary,
  dashboardAttentionTitle,
  type DashboardWeekScope,
} from "../lib/dashboardOperational";

interface Props {
  onDismiss: () => void;
  onOpenAssistant: () => void;
  onOpenRota: () => void;
  onReviewTimesheets: () => void;
  openShiftCount: number;
  pendingTimeCount: number;
  pendingLeaveCount: number;
  /** Which week the counts describe, so the copy uses "this week" vs "next week". */
  weekScope: DashboardWeekScope;
}

export function DashboardAISummaryCard({
  onDismiss,
  onOpenAssistant,
  onOpenRota,
  onReviewTimesheets,
  openShiftCount,
  pendingTimeCount,
  pendingLeaveCount,
  weekScope,
}: Props) {
  const activeCategories = [openShiftCount, pendingTimeCount, pendingLeaveCount].filter(
    (count) => count > 0,
  ).length;
  return (
    <AiSuggestionCard
      tone="teal"
      title={dashboardAttentionTitle(activeCategories)}
      body={dashboardAttentionSummary({
        weekScope,
        openShifts: openShiftCount,
        pendingTime: pendingTimeCount,
        pendingLeave: pendingLeaveCount,
      })}
      onDismiss={onDismiss}
      actions={[
        {
          label: "Manager support",
          primary: true,
          icon: <Sparkles className="h-3.5 w-3.5" aria-hidden />,
          onClick: onOpenAssistant,
        },
        {
          label: "Open rota",
          icon: <Calendar className="h-3.5 w-3.5" aria-hidden />,
          onClick: onOpenRota,
        },
        {
          label: "Review timesheets",
          icon: <Clock3 className="h-3.5 w-3.5" aria-hidden />,
          onClick: onReviewTimesheets,
        },
      ]}
    />
  );
}
