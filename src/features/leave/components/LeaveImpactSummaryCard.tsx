import { CalendarDays } from "lucide-react";
import { AiChip } from "@/components/ai/AiChip";
import type { LeaveRequest } from "../types";

interface Props {
  request: LeaveRequest;
  onCheckRota: () => void;
}

function headline(request: LeaveRequest): string {
  if (request.impact === "High")
    return "Possible high coverage impact — check cover before deciding";
  if (request.impact === "Medium") return "Possible coverage impact — review cover before deciding";
  return "Low recorded coverage impact for these dates";
}

function body(request: LeaveRequest): string {
  const firstName = request.n.split(" ")[0];
  return `${firstName} requested ${request.days} day${request.days === 1 ? "" : "s"} with ${request.notice} day${request.notice === 1 ? "" : "s"} notice. Open the rota for these dates to check who is scheduled before you decide.`;
}

/**
 * Coverage-impact review aid for a pending request. Shows the recorded impact
 * tier and the request's own structured facts only — it does not invent named
 * cover, percentages, or a recommendation. The manager checks the rota and
 * decides.
 */
export function LeaveImpactSummaryCard({ request, onCheckRota }: Props) {
  return (
    <div
      className="rounded-xl border p-3.5"
      style={{ background: "var(--st-teal-bg)", borderColor: "var(--st-teal-line)" }}
    >
      <div className="row gap-2 mb-2" style={{ alignItems: "center" }}>
        <AiChip size="sm" label="Coverage check" />
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
