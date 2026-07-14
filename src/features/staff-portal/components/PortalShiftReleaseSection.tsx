import * as React from "react";
import { toast } from "sonner";
import {
  ActionButton,
  ConfirmDialog,
  DashboardCard,
  FormSection,
  StatusBadge,
} from "@/components/dl";
import { usePortalShiftReleases } from "../hooks/usePortalShiftReleases";
import {
  canRequestShiftRelease,
  shiftReleaseStatusPresentation,
} from "../lib/shiftReleaseRequests";
import type { PortalShift } from "../types";

const RESPONSIBILITY_COPY =
  "You remain scheduled and responsible for this shift until your manager republishes the rota.";

export function PortalShiftReleaseSection({ shift }: { shift: PortalShift }) {
  const releases = usePortalShiftReleases();
  const [reason, setReason] = React.useState("");
  const [confirmWithdraw, setConfirmWithdraw] = React.useState(false);
  if (!releases.enabled) return null;

  const request = releases.requestFor(shift.id);
  const presentation = request ? shiftReleaseStatusPresentation(request.status) : null;
  const hasStarted = shift.startsAtMs !== undefined && shift.startsAtMs <= Date.now();
  const canRequest = !hasStarted && canRequestShiftRelease(request?.status ?? null);
  const submit = async () => {
    const result = await releases.request(shift.id, reason.trim());
    if (!result.ok) return toast.error("Release not requested", { description: result.message });
    setReason("");
    toast.success("Release requested", {
      description: "Your manager will review it. You remain responsible until republish.",
    });
  };
  const withdraw = async () => {
    if (!request) return;
    const result = await releases.withdraw(request.requestId);
    setConfirmWithdraw(false);
    if (!result.ok) return toast.error("Request not withdrawn", { description: result.message });
    toast.success("Release request withdrawn");
  };

  return (
    <FormSection title="Shift release">
      {releases.isLoading ? (
        <p role="status" className="text-xs text-muted-foreground">
          Loading release status…
        </p>
      ) : releases.isError ? (
        <div role="alert" className="rounded-xl border border-danger/30 bg-danger-soft p-3">
          <p className="text-xs text-danger">Release status could not be loaded.</p>
          <ActionButton className="mt-2" size="sm" variant="secondary" onClick={releases.retry}>
            Try again
          </ActionButton>
        </div>
      ) : (
        <>
          {request && presentation && (
            <DashboardCard className="p-3">
              <div className="flex items-center justify-between gap-2">
                <StatusBadge tone={presentation.tone}>{presentation.label}</StatusBadge>
                {request.status === "pending" && (
                  <ActionButton
                    size="sm"
                    variant="ghost"
                    disabled={releases.isSaving}
                    onClick={() => setConfirmWithdraw(true)}
                  >
                    Withdraw
                  </ActionButton>
                )}
              </div>
              <p className="mt-2 text-xs">
                <span className="font-medium">Your reason:</span> {request.reason}
              </p>
              {request.decisionReason && (
                <p className="mt-1 text-xs">
                  <span className="font-medium">Manager note:</span> {request.decisionReason}
                </p>
              )}
              {presentation.responsibilityContinues && (
                <p className="mt-2 text-xs font-medium text-warning">{RESPONSIBILITY_COPY}</p>
              )}
              {request.status === "completed" && (
                <p className="mt-2 text-xs text-success">
                  The republished rota no longer assigns this shift to you.
                </p>
              )}
              {request.status === "stale" && (
                <p className="mt-2 text-xs text-muted-foreground">
                  The published source shift changed or disappeared. Review your current rota.
                </p>
              )}
            </DashboardCard>
          )}
          {canRequest && (
            <div className="grid gap-2">
              <p className="text-xs text-muted-foreground">
                Ask to be released from this assigned published shift. Approval reopens the draft
                shift; it does not change what you are currently responsible for.
              </p>
              <label className="grid gap-1 text-xs font-medium">
                Reason
                <textarea
                  required
                  rows={3}
                  maxLength={2000}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Why do you need to be released?"
                  className="resize-none rounded-xl border border-border bg-card px-3 py-2 text-sm"
                />
              </label>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-muted-foreground">{reason.length} / 2000</span>
                <ActionButton
                  size="sm"
                  disabled={releases.isSaving || reason.trim().length === 0}
                  onClick={() => void submit()}
                >
                  {request?.status === "withdrawn" ? "Request again" : "Request release"}
                </ActionButton>
              </div>
            </div>
          )}
          {hasStarted && !request && (
            <p className="text-xs text-muted-foreground">
              Release requests are available only before an assigned shift starts.
            </p>
          )}
        </>
      )}
      <ConfirmDialog
        open={confirmWithdraw}
        onOpenChange={setConfirmWithdraw}
        title="Withdraw this release request?"
        description="Your manager will no longer review it. You remain responsible for the published shift."
        confirmLabel="Withdraw request"
        onConfirm={() => void withdraw()}
      />
    </FormSection>
  );
}
