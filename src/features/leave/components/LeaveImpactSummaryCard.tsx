import { CalendarDays } from "lucide-react";
import { AiChip } from "@/components/ai/AiChip";
import type { LeaveRequest } from "../types";

interface Props {
  request: LeaveRequest;
  onCheckRota: () => void;
}

function headline(request: LeaveRequest): string {
  const days = `${request.days} day${request.days === 1 ? "" : "s"}`;
  if (request.impact === "High")
    return `Longer request (${days}) — check the rota for these dates before deciding`;
  if (request.impact === "Medium")
    return `Multi-day request (${days}) — review the rota before deciding`;
  return `Short request (${days})`;
}

function body(request: LeaveRequest): string {
  const firstName = request.n.split(" ")[0];
  return `${firstName} requested ${request.days} day${request.days === 1 ? "" : "s"} with ${request.notice} day${request.notice === 1 ? "" : "s"} notice. Open the rota for these dates to check who is scheduled before you decide.`;
}

/**
 * Review aid for a pending request. Describes the request's length and the
 * request's own structured facts only — duration is not presented as coverage
 * risk, and it does not invent named cover, percentages, or a recommendation.
 * The manager checks the rota and decides.
 */
export function LeaveImpactSummaryCard({ request, onCheckRota }: Props) {
  return (
    <div
      className="rounded-xl border p-3.5"
      style={{ background: "var(--st-teal-bg)", borderColor: "var(--st-teal-line)" }}
    >
      <div className="row gap-2 mb-2" style={{ alignItems: "center" }}>
        <AiChip size="sm" label="Rota check" />
        <span className="muted txt-xs">Review before deciding</span>
      </div>
      <div className="strong txt-sm" style={{ color: "var(--st-teal-ink)" }}>
        {headline(request)}
      </div>
      <div className="muted txt-sm mt-2" style={{ lineHeight: 1.55 }}>
        {body(request)}
      </div>
      <div className="row gap-2 mt-3">
        <button type="button" className="btn outline-teal sm" onClick={onCheckRota}>
          <CalendarDays className="h-3 w-3" aria-hidden /> Check rota
        </button>
      </div>
    </div>
  );
}
