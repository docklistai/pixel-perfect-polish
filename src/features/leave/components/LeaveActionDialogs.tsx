import * as React from "react";
import { ActionButton, DialogShell, StatusBadge } from "@/components/dl";
import { Check, X } from "lucide-react";
import type { LeaveRequest, LeaveSource } from "../types";
import { approvalDialogRows, consumesAnnualEntitlement } from "../lib/leaveActionDialogContent";
import { useStaffEntitlement } from "../hooks/useStaffEntitlement";
import { LeaveManagerCreateDialog } from "./LeaveManagerCreateDialog";

interface Props {
  source: LeaveSource;
  decisionRequest: LeaveRequest | null;
  decisionType: "approve" | "decline" | "cancel" | null;
  decisionPending: boolean;
  newRequestOpen: boolean;
  onDecisionOpenChange: (open: boolean) => void;
  onNewRequestOpenChange: (open: boolean) => void;
  onApprove: (id: string, reason: string) => void;
  onDecline: (id: string, reason: string) => void;
  onCancel: (id: string, reason: string) => void;
  onCreateRequest: (request: LeaveRequest) => void;
}

function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
}

export function LeaveActionDialogs({
  source,
  decisionRequest,
  decisionType,
  decisionPending,
  newRequestOpen,
  onDecisionOpenChange,
  onNewRequestOpenChange,
  onApprove,
  onDecline,
  onCancel,
  onCreateRequest,
}: Props) {
  const [declineReason, setDeclineReason] = React.useState(
    "We can't cover these dates — could you suggest the week before or after?",
  );
  const [cancellationReason, setCancellationReason] = React.useState("");

  const isApprove = decisionType === "approve";
  const isCancel = decisionType === "cancel";
  const decisionOpen = Boolean(decisionRequest && decisionType);

  // Balance context is read only for a live annual-leave approval. Any other
  // combination passes null, so the hook stays disabled and no request is made.
  const balanceStaffId =
    source === "live" && isApprove && decisionRequest && consumesAnnualEntitlement(decisionRequest)
      ? decisionRequest.staffId
      : null;
  const entitlement = useStaffEntitlement(balanceStaffId);
  const approvalRows = decisionRequest
    ? approvalDialogRows(source, decisionRequest, entitlement.result?.balance ?? null)
    : [];

  React.useEffect(() => {
    if (decisionType === "cancel") setCancellationReason("");
  }, [decisionRequest?.id, decisionType]);

  return (
    <>
      <DialogShell
        open={decisionOpen}
        onOpenChange={(open) => {
          if (!decisionPending) onDecisionOpenChange(open);
        }}
        title={
          isApprove
            ? `Approve ${decisionRequest?.n ?? "this request"}'s leave?`
            : isCancel
              ? "Cancel this approved leave?"
              : "Decline this leave request?"
        }
        description={
          decisionRequest
            ? isApprove
              ? `${decisionRequest.date} · ${decisionRequest.days} days · ${decisionRequest.type}`
              : `${decisionRequest.n} · ${decisionRequest.date}`
            : undefined
        }
        icon={isApprove ? Check : X}
        iconTone={isApprove ? "success" : "danger"}
        footer={
          <>
            <ActionButton
              variant="secondary"
              size="sm"
              onClick={() => onDecisionOpenChange(false)}
              disabled={decisionPending}
            >
              Cancel
            </ActionButton>
            <ActionButton
              variant={isApprove ? "primary" : "danger"}
              size="sm"
              onClick={() => {
                if (!decisionRequest) return;
                if (isApprove) onApprove(decisionRequest.id, "Approved after coverage review.");
                else if (isCancel) onCancel(decisionRequest.id, cancellationReason.trim());
                else onDecline(decisionRequest.id, declineReason);
              }}
              disabled={decisionPending || (isCancel && !cancellationReason.trim())}
            >
              {decisionPending ? (
                "Saving..."
              ) : isApprove ? (
                <>
                  <Check className="h-3 w-3" aria-hidden /> Approve
                </>
              ) : (
                <>
                  <X className="h-3 w-3" aria-hidden />
                  {isCancel ? "Cancel approved leave" : "Decline request"}
                </>
              )}
            </ActionButton>
          </>
        }
      >
        {decisionRequest && isApprove && (
          <>
            <div className="row gap-3 mb-3">
              <div className="av av-c3">{initials(decisionRequest.n)}</div>
              <div>
                <div className="strong">{decisionRequest.n}</div>
                <div className="muted txt-sm">{decisionRequest.role}</div>
              </div>
            </div>
            <div className="card" style={{ background: "var(--bg-raised)" }}>
              <div className="card-section space-y-2">
                {approvalRows.map((row) => (
                  <div key={row.label} className="row justify-between gap-3">
                    <span className="muted txt-sm">{row.label}</span>
                    {row.kind === "badge" ? (
                      <StatusBadge tone={row.tone} dot>
                        {row.value}
                      </StatusBadge>
                    ) : (
                      <span className="strong text-right">{row.value}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <p className="muted txt-sm mt-3">
              Approved leave is included in rota conflict checks. Portal staff receive a staff-safe
              decision update automatically.
            </p>
          </>
        )}

        {decisionRequest && !isApprove && (
          <>
            <p className="muted txt-sm mb-3">
              {isCancel
                ? "This does not republish the rota. If the leave overlaps a published week, Docklist retains a Rota update required issue until that week is republished."
                : `${decisionRequest.n} will see your reason in their staff app. They can request again with a new date.`}
            </p>
            <div className="field">
              <label htmlFor={isCancel ? "leave-cancel-reason" : "leave-decline-reason"}>
                {isCancel ? "Cancellation reason (required)" : "Reason for decline"}
              </label>
              <textarea
                id={isCancel ? "leave-cancel-reason" : "leave-decline-reason"}
                className="dl-textarea"
                rows={3}
                maxLength={2000}
                value={isCancel ? cancellationReason : declineReason}
                disabled={decisionPending}
                onChange={(event) =>
                  isCancel
                    ? setCancellationReason(event.target.value)
                    : setDeclineReason(event.target.value)
                }
              />
            </div>
          </>
        )}
      </DialogShell>

      <LeaveManagerCreateDialog
        source={source}
        open={newRequestOpen}
        onOpenChange={onNewRequestOpenChange}
        onCreateRequest={onCreateRequest}
      />
    </>
  );
}
