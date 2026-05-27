import { Card, ActionButton, DetailRow, StatusBadge } from "@/components/dl";
import { cn } from "@/lib/utils";
import { Check, X } from "lucide-react";
import type { LeaveRequest } from "../types";

interface Props {
  request: LeaveRequest;
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

const coverageRows = [
  { label: "Sat 31 May", value: 60, tone: "warning" as const },
  { label: "Sun 01 Jun", value: 50, tone: "danger" as const },
  { label: "Mon 02 Jun", value: 66, tone: "warning" as const },
];

const otherRequests = [
  { name: "Daniel Mitchell", dates: "26 – 27 May" },
  { name: "Sophie Carter", dates: "18 – 20 May" },
];

export function LeaveDetailPanel({ request, onApprove, onDecline, onReopen, onOpenRisk }: Props) {
  const isApproved = request.state === "approved";
  const isDeclined = request.state === "declined";
  const impactTone =
    request.tone === "danger" ? "danger" : request.tone === "warning" ? "warning" : "success";

  return (
    <Card
      className="col-span-12 lg:col-span-5 sticky top-[88px] self-start overflow-hidden"
      padding="none"
    >
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
                {request.impact} coverage impact
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
      </div>

      <div className="card-section">
        <div className="section-label mb-2">Also off this period</div>
        <div className="space-y-3">
          {otherRequests.map((person) => (
            <div key={person.name} className="row gap-3">
              <div className="av av-c2 sm">{initials(person.name)}</div>
              <div className="min-w-0 grow">
                <div className="strong txt-sm">{person.name}</div>
                <div className="muted txt-xs mono">{person.dates}</div>
              </div>
              <StatusBadge tone="muted">Annual</StatusBadge>
            </div>
          ))}
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
