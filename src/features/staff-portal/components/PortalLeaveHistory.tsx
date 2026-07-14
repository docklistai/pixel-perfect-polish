import * as React from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import {
  ActionButton,
  ConfirmDialog,
  DashboardCard,
  DetailRow,
  DrawerShell,
  FormSection,
  StatusBadge,
  type Tone,
} from "@/components/dl";
import type { PortalLeaveRequest } from "../api/portalLiveData";

function status(request: PortalLeaveRequest): { label: string; tone: Tone } {
  switch (request.status) {
    case "pending":
      return { label: "Pending", tone: "warning" };
    case "approved":
      return { label: "Approved", tone: "success" };
    case "declined":
      return { label: "Declined", tone: "danger" };
    case "cancelled":
      return {
        label: request.cancellationSource === "manager" ? "Cancelled" : "Withdrawn",
        tone: "muted",
      };
  }
}

export function PortalLeaveHistory({
  requests,
  isLoading,
  isError,
  isWithdrawing,
  onRetry,
  onWithdraw,
}: {
  requests: PortalLeaveRequest[];
  isLoading: boolean;
  isError: boolean;
  isWithdrawing: boolean;
  onRetry: () => void;
  onWithdraw: (requestId: string) => void;
}) {
  const [detailId, setDetailId] = React.useState<string | null>(null);
  const [confirming, setConfirming] = React.useState(false);
  const detail = requests.find((request) => request.id === detailId) ?? null;
  const detailStatus = detail ? status(detail) : null;

  return (
    <>
      <div>
        <div className="mb-2 px-1 text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
          Request history
        </div>
        {isLoading ? (
          <DashboardCard className="p-4 text-center">
            <div role="status">
              <Loader2 className="mx-auto h-4 w-4 animate-spin" />
              <div className="mt-2 text-sm text-muted-foreground">Loading leave requests...</div>
            </div>
          </DashboardCard>
        ) : isError ? (
          <DashboardCard className="p-4 text-center">
            <div role="alert">
              <AlertTriangle className="mx-auto h-4 w-4 text-danger" />
              <div className="mt-2 text-sm font-semibold">Leave requests are unavailable</div>
              <ActionButton variant="secondary" size="sm" className="mt-2" onClick={onRetry}>
                Try again
              </ActionButton>
            </div>
          </DashboardCard>
        ) : requests.length === 0 ? (
          <DashboardCard className="p-4 text-center">
            <div className="text-sm font-semibold text-muted-foreground">No requests yet</div>
          </DashboardCard>
        ) : (
          <ul className="space-y-2">
            {requests.map((request) => {
              const requestStatus = status(request);
              return (
                <li key={request.id}>
                  <button
                    type="button"
                    onClick={() => setDetailId(request.id)}
                    className="w-full rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:bg-muted/40"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold">{request.type}</div>
                        <div className="truncate text-xs text-muted-foreground">{request.date}</div>
                      </div>
                      <StatusBadge tone={requestStatus.tone}>{requestStatus.label}</StatusBadge>
                    </div>
                    <div className="mt-2 text-[11px] text-muted-foreground">
                      Submitted {request.submittedAt}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <DrawerShell
        open={detail !== null}
        onOpenChange={(open) => !open && setDetailId(null)}
        title={detail?.type ?? "Leave request"}
        description={detail?.submittedAt}
        width="lg"
        footer={
          <>
            <ActionButton variant="secondary" onClick={() => setDetailId(null)}>
              Close
            </ActionButton>
            {detail?.status === "pending" && (
              <ActionButton
                variant="danger"
                disabled={isWithdrawing}
                onClick={() => setConfirming(true)}
              >
                Withdraw
              </ActionButton>
            )}
          </>
        }
      >
        {detail && detailStatus && (
          <FormSection title="Request">
            <DetailRow
              label="Status"
              value={<StatusBadge tone={detailStatus.tone}>{detailStatus.label}</StatusBadge>}
            />
            <DetailRow label="Dates" value={detail.date} />
            <DetailRow label="Days" value={`${detail.days} days`} />
            <DetailRow label="Note" value={detail.reason} />
            {detail.decisionReason && (
              <DetailRow label="Manager response" value={detail.decisionReason} />
            )}
          </FormSection>
        )}
      </DrawerShell>

      <ConfirmDialog
        open={confirming && detail?.status === "pending"}
        onOpenChange={setConfirming}
        title="Withdraw this leave request?"
        description="This cancels only your pending request. It does not change approved leave or republish a rota."
        confirmLabel="Withdraw request"
        tone="danger"
        onConfirm={() => {
          if (!detail || isWithdrawing) return;
          setConfirming(false);
          onWithdraw(detail.id);
        }}
      />
    </>
  );
}
