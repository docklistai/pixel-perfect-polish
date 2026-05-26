import { Card, ActionButton, DetailRow, FormSection, StatusBadge } from "@/components/dl";
import { cn } from "@/lib/utils";
import type { LeaveRequest } from "../types";

interface Props {
  request: LeaveRequest;
  approved: Set<string>;
  declined: Set<string>;
  onApprove: (id: string) => void;
  onDecline: (id: string) => void;
  onReopen: (id: string) => void;
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
  { name: "Sophie Carter", dates: "27 – 29 May" },
];

export function LeaveDetailPanel({
  request,
  approved,
  declined,
  onApprove,
  onDecline,
  onReopen,
}: Props) {
  const isApproved = approved.has(request.id);
  const isDeclined = declined.has(request.id);
  const badgeTone = isApproved ? "success" : isDeclined ? "danger" : "warning";

  return (
    <Card
      className="col-span-12 lg:col-span-5 sticky top-[88px] self-start overflow-hidden"
      padding="none"
    >
      <div className="card-section">
        <div className="section-label mb-2">Decision context</div>
        <div className="row gap-3" style={{ alignItems: "center" }}>
          <div className={cn("av av-c4")}>{initials(request.n)}</div>
          <div className="min-w-0">
            <div className="strong">{request.n}</div>
            <div className="muted txt-sm">
              {request.role} · {request.dept}
            </div>
            <div className="mt-2">
              <StatusBadge tone={badgeTone}>
                {isApproved ? "Approved" : isDeclined ? "Declined" : "Pending"}
              </StatusBadge>
            </div>
          </div>
        </div>

        <div className="card mt-3" style={{ background: "var(--bg-raised)" }}>
          <div className="card-section">
            <dl className="divide-y divide-border">
              <DetailRow label="Requested" value={request.date} />
              <DetailRow label="Days" value={request.dur} />
              <DetailRow label="Submitted" value={request.submitted} />
              <DetailRow label="Balance after" value={request.balance} />
              <DetailRow label="Type" value="Annual leave" />
            </dl>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">{request.coverNote}</p>
      </div>

      <FormSection title="Coverage on these days">
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
      </FormSection>

      <FormSection title="Also off this period">
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
      </FormSection>

      <div className="card-foot row gap-2">
        {isApproved || isDeclined ? (
          <ActionButton className="flex-1" onClick={() => onReopen(request.id)}>
            Reopen
          </ActionButton>
        ) : (
          <>
            <ActionButton
              variant="secondary"
              className="flex-1"
              onClick={() => onDecline(request.id)}
            >
              Decline
            </ActionButton>
            <ActionButton className="flex-1" onClick={() => onApprove(request.id)}>
              Approve
            </ActionButton>
          </>
        )}
      </div>
    </Card>
  );
}
