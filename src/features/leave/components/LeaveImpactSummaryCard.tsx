import { CalendarDays, Sparkles } from "lucide-react";
import { AiChip } from "@/components/ai/AiChip";
import type { LeaveRequest } from "../types";

interface Props {
  request: LeaveRequest;
  onAskAssistant: (prompt: string) => void;
  onCheckRota: () => void;
}

function headline(request: LeaveRequest): string {
  if (request.impact === "High") return "Approving will leave Housekeeping under 50% on Sunday";
  if (request.impact === "Medium") return "Coverage stays above 80% — manageable with one swap";
  return "No coverage risk — safe to approve as-is";
}

function body(request: LeaveRequest): string {
  if (request.impact === "High")
    return "Ava could swap her Sunday rest day with Tuesday — this closes the Sunday gap without changing her total weekly hours.";
  if (request.impact === "Medium")
    return "Two staff could cover the affected shift. Liam is available and is under his contracted hours this week.";
  return `${request.n.split(" ")[0]} gave ${request.notice} days notice and is taking ${request.days} days. Within policy, no cover needed.`;
}

/** AI coverage-impact summary shown under the decision panel for pending requests. */
export function LeaveImpactSummaryCard({ request, onAskAssistant, onCheckRota }: Props) {
  return (
    <div
      className="rounded-xl border p-3.5"
      style={{ background: "var(--st-teal-bg)", borderColor: "var(--st-teal-line)" }}
    >
      <div className="row gap-2 mb-2" style={{ alignItems: "center" }}>
        <AiChip size="sm" />
        <span className="muted txt-xs">Coverage impact · review before deciding</span>
      </div>
      <div className="strong txt-sm" style={{ color: "var(--st-teal-ink)" }}>
        {headline(request)}
      </div>
      <div className="muted txt-sm mt-2" style={{ lineHeight: 1.55 }}>
        {body(request)}
      </div>
      <div className="row gap-2 mt-3">
        <button
          type="button"
          className="btn outline-teal sm"
          onClick={() =>
            onAskAssistant(`Help me plan cover if I approve ${request.n}'s leave ${request.date}`)
          }
        >
          <Sparkles className="h-3 w-3" aria-hidden /> Ask assistant
        </button>
        <button type="button" className="btn ghost sm" onClick={onCheckRota}>
          <CalendarDays className="h-3 w-3" aria-hidden /> Check rota
        </button>
      </div>
    </div>
  );
}
