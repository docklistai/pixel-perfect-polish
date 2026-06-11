import { Calendar, Clock3, Sparkles } from "lucide-react";
import { AiSuggestionCard } from "@/components/ai/AiSuggestionCard";

interface Props {
  onDismiss: () => void;
  onOpenAssistant: () => void;
  onOpenRota: () => void;
  onReviewTimesheets: () => void;
}

export function DashboardAISummaryCard({
  onDismiss,
  onOpenAssistant,
  onOpenRota,
  onReviewTimesheets,
}: Props) {
  return (
    <AiSuggestionCard
      tone="teal"
      title="3 things worth your attention today"
      body="Next week's draft has Daniel's Friday overlap and two open shifts. Four timesheets need manager review before approved hours can be exported."
      onDismiss={onDismiss}
      actions={[
        {
          label: "Open assistant",
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
