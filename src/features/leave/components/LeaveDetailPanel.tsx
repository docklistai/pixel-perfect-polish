import { Card, ActionButton, DetailRow, StatusBadge } from "@/components/dl";
import { cn } from "@/lib/utils";
import { Check, X } from "lucide-react";
import type { LeaveRequest, LeaveSource } from "../types";
import { leaveRangesOverlap } from "../lib/leaveDates";
import { coverageRowsForRequest } from "../lib/leaveCards";

interface Props {
  request: LeaveRequest;
  requests: LeaveRequest[];
  source: LeaveSource;
  onApprove: (request: LeaveRequest) => void;
  onDecline: (request: LeaveRequest) => void;
  onReopen: (id: string) => void;
  onOpenRisk: () => void;
}

function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
}

export function LeaveDetailPanel({
  request,
  requests,
  source,
  onApprove,
  onDecline,
  onReopen,
  onOpenRisk,
}: Props) {
  const isApproved = request.state === "approved";
  const isDeclined = request.state === "declined";
  const isCancelled = request.state === "cancelled";
  // Demo shows illustrative coverage bars; live has no real coverage source, so
  // it routes the manager to the rota instead of inventing percentages.
  const coverageRows = coverageRowsForRequest(request, source);
  const otherRequests = requests.filter(
    (item) =>
      item.id !== request.id &&
      item.state !== "declined" &&
      item.state !== "cancelled" &&
      leaveRangesOverlap(item.startIso, item.endIso, request.startIso, request.endIso),
  );
  const latestDecision = request.decisionHistory?.at(-1);
  const impactTone =
    request.tone === "danger" ? "danger" : request.tone === "warning" ? "warning" : "success";

  return (
    <Card className="overflow-hidden" padding="none">
      <div className="card-section">
        <div className="section-label mb-2">Decision context</div>
        <div className="row gap-3" style={{ alignItems: "center" }}>
          <div className={cn("av av-c3 lg")}>{initials(request.n)}</div>
          <div className="min-w-0">
            <div className="strong">{request.n}</div>
            <div className="muted txt-sm">
              {request.role} · {request.dept}
            </div>
            <div className="mt-2">
              <StatusBadge tone={impactTone} dot>
                {request.impact} duration
              </StatusBadge>
            </div>
          </div>
        </div>

        <div className="card mt-3" style={{ background: "var(--bg-raised)" }}>
          <div className="card-section">
            <dl className="divide-y divide-border">
              <DetailRow label="Requested" value={request.date} />
              <DetailRow label="Days" value={`${request.days} days`} />
              <DetailRow label="Notice" value={`${request.notice} days`} />
              <DetailRow label="Balance after" value={request.balance} />
              <DetailRow label="Type" value={request.type} />
              {latestDecision && <DetailRow label="Decision note" value={latestDecision.reason} />}
            </dl>
          </div>
        </div>
      </div>

      <div className="card-section">
        <div className="row gap-2 mb-2">
          <div className="section-label">Coverage on these days</div>
          <div className="grow" />
          <button type="button" className="btn ghost sm" onClick={onOpenRisk}>
            View risk
          </button>
        </div>
        {coverageRows ? (
          <div className="space-y-3">
            {coverageRows.map((row) => (
              <div key={row.label} className="row gap-3 txt-sm" style={{ alignItems: "center" }}>
                <span className="muted mono" style={{ width: 78 }}>
                  {row.label}
                </span>
                <span className="bar" style={{ flex: 1 }}>
                  <i
                    style={{
                      width: `${row.value}%`,
                      background: row.tone === "danger" ? "var(--red-500)" : "var(--amber-500)",
                    }}
                  />
                </span>
                <span
                  className={cn("strong mono", row.tone === "danger" ? "text-red" : "text-amber")}
                  style={{ width: 36, textAlign: "right" }}
                >
                  {row.value}%
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="txt-sm">
            <div className="muted mono">{request.date}</div>
            <p className="muted mt-2" style={{ lineHeight: 1.55 }}>
              Not enough data here for a coverage figure. Open the rota for these dates to confirm
              who is scheduled before you decide.
            </p>
          </div>
        )}
      </div>

      <div className="card-section">
        <div className="section-label mb-2">Other requests in this period</div>
        <div className="space-y-3">
          {otherRequests.map((person) => (
            <div key={person.id} className="row gap-3">
              <div className="av av-c2 sm">{initials(person.n)}</div>
              <div className="min-w-0 grow">
                <div className="strong txt-sm">{person.n}</div>
                <div className="muted txt-xs mono">{person.date}</div>
              </div>
              <StatusBadge tone={person.state === "approved" ? "success" : "warning"}>
                {person.state === "approved" ? "Approved" : "Pending"}
              </StatusBadge>
            </div>
          ))}
          {otherRequests.length === 0 && (
            <div className="muted txt-sm">No overlapping requests.</div>
          )}
        </div>
      </div>

      <div className="card-foot row gap-2">
        {isApproved ? (
          <StatusBadge tone="success" className="w-full justify-center">
            <Check className="h-3 w-3" aria-hidden /> Approved
          </StatusBadge>
        ) : isDeclined ? (
          <StatusBadge tone="danger" className="w-full justify-center">
            <X className="h-3 w-3" aria-hidden /> Declined
          </StatusBadge>
        ) : isCancelled ? (
          <StatusBadge tone="muted" className="w-full justify-center">
            <X className="h-3 w-3" aria-hidden /> Cancelled by staff
          </StatusBadge>
        ) : (
          <>
            <ActionButton
              variant="secondary"
              className="flex-1"
              size="sm"
              onClick={() => onDecline(request)}
            >
              Decline
            </ActionButton>
            <ActionButton className="flex-1" size="sm" onClick={() => onApprove(request)}>
              <Check className="h-3 w-3" aria-hidden />
              Approve
            </ActionButton>
          </>
        )}
        {(isApproved || isDeclined) && (
          <ActionButton variant="secondary" size="sm" onClick={() => onReopen(request.id)}>
            Reopen
          </ActionButton>
        )}
      </div>
    </Card>
  );
}
