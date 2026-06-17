import { Calendar, Clock3, Sparkles } from "lucide-react";
import { AiSuggestionCard } from "@/components/ai/AiSuggestionCard";

interface Props {
  onDismiss: () => void;
  onOpenAssistant: () => void;
  onOpenRota: () => void;
  onReviewTimesheets: () => void;
  openShiftCount: number;
  pendingTimeCount: number;
  pendingLeaveCount: number;
}

export function DashboardAISummaryCard({
  onDismiss,
  onOpenAssistant,
  onOpenRota,
  onReviewTimesheets,
  openShiftCount,
  pendingTimeCount,
  pendingLeaveCount,
}: Props) {
  return (
    <AiSuggestionCard
      tone="teal"
      title={`${[openShiftCount, pendingTimeCount, pendingLeaveCount].filter((count) => count > 0).length} things worth your attention today`}
      body={`Next week's draft has ${openShiftCount} open shifts. ${pendingTimeCount} timesheets need manager review and ${pendingLeaveCount} leave requests are pending.`}
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
