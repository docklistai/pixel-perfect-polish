import * as React from "react";
import { AlertTriangle, CheckCircle2, Send } from "lucide-react";
import { ActionButton, DialogShell } from "@/components/dl";
import type { MaybePromise } from "./grid";

type ReadinessCheck = {
  label: string;
  value: string;
  ok: boolean;
};

export function PublishRotaDialog({
  open,
  onOpenChange,
  weekLabel,
  staffCount,
  assignedShiftCount,
  plannedShiftCount,
  coveragePct,
  conflictCount,
  openShiftCount,
  workingTimeAlertCount,
  published,
  hasUnpublishedChanges,
  canPublish,
  publishBlockedReason,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  weekLabel: string;
  staffCount: number;
  assignedShiftCount: number;
  plannedShiftCount: number;
  coveragePct: number;
  conflictCount: number;
  openShiftCount: number;
  workingTimeAlertCount: number;
  published: boolean;
  hasUnpublishedChanges: boolean;
  canPublish: boolean;
  publishBlockedReason: string | null;
  onConfirm: (prepareStaffUpdate: boolean) => MaybePromise<void>;
}) {
  const [prepareStaffUpdate, setPrepareStaffUpdate] = React.useState(true);
  const [issuesAcknowledged, setIssuesAcknowledged] = React.useState(false);
  const [publishing, setPublishing] = React.useState(false);
  const issueCount = conflictCount + openShiftCount + workingTimeAlertCount;
  const hasIssues = issueCount > 0;
  const publishActionLabel = published && hasUnpublishedChanges ? "Republish" : "Publish";

  React.useEffect(() => {
    if (open) {
      setPrepareStaffUpdate(true);
      setIssuesAcknowledged(false);
      setPublishing(false);
    }
  }, [open]);

  const handleConfirm = async () => {
    if (!canPublish || (hasIssues && !issuesAcknowledged)) return;
    setPublishing(true);
    try {
      await onConfirm(prepareStaffUpdate);
    } catch {
      // Route/persistence handlers own publish failure toasts and keep the dialog open.
    } finally {
      setPublishing(false);
    }
  };

  const checks: ReadinessCheck[] = [
    {
      label: "Shifts assigned",
      value: `${assignedShiftCount} / ${plannedShiftCount}`,
      ok: plannedShiftCount > 0 && assignedShiftCount === plannedShiftCount,
    },
    { label: "Coverage target", value: `${coveragePct}%`, ok: coveragePct >= 100 },
    {
      label: "Conflicts resolved",
      value: conflictCount === 0 ? "All clear" : `${conflictCount} open`,
      ok: conflictCount === 0,
    },
    {
      label: "Open shifts",
      value: openShiftCount === 0 ? "All covered" : `${openShiftCount} open`,
      ok: openShiftCount === 0,
    },
    {
      label: "Working time",
      value:
        workingTimeAlertCount === 0
          ? "Clear"
          : `${workingTimeAlertCount} alert${workingTimeAlertCount === 1 ? "" : "s"}`,
      ok: workingTimeAlertCount === 0,
    },
  ];

  return (
    <DialogShell
      open={open}
      onOpenChange={onOpenChange}
      title={`${publishActionLabel} this rota?`}
      description={`${weekLabel} - ${staffCount} staff`}
      icon={Send}
      footer={
        <>
          <ActionButton variant="ghost" disabled={publishing} onClick={() => onOpenChange(false)}>
            Cancel
          </ActionButton>
          <ActionButton
            icon={Send}
            disabled={publishing || !canPublish || (hasIssues && !issuesAcknowledged)}
            onClick={() => void handleConfirm()}
          >
            {publishActionLabel} to {staffCount} staff
          </ActionButton>
        </>
      }
    >
      <p>
        Staff see only the published snapshot in the Docklist mobile portal. Draft edits stay
        manager-only until you publish again.
      </p>

      {!canPublish && publishBlockedReason && (
        <p className="mt-3 text-sm font-medium text-warning">{publishBlockedReason}</p>
      )}

      <div className="card mt-3 p-3" style={{ background: "var(--bg-raised)" }}>
        <div className="text-sm font-semibold">
          {published && hasUnpublishedChanges ? "Re-publish change summary" : "Publish summary"}
        </div>
        <ul className="mt-2 flex flex-col gap-1.5 text-sm text-muted-foreground">
          <li>{plannedShiftCount} planned shifts in this draft.</li>
          <li>{assignedShiftCount} assigned shifts will be visible to assigned staff.</li>
          <li>{openShiftCount} open shifts stay manager-only until assigned.</li>
          <li>
            {conflictCount + workingTimeAlertCount} rota issue
            {conflictCount + workingTimeAlertCount === 1 ? "" : "s"} remain for manager review.
          </li>
        </ul>
      </div>

      <div className="card mt-3 p-3" style={{ background: "var(--bg-raised)" }}>
        {checks.map((check) => (
          <div key={check.label} className="flex items-center gap-2 py-1.5 text-sm">
            {check.ok ? (
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success" aria-hidden />
            ) : (
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-warning" aria-hidden />
            )}
            <span className="flex-1">{check.label}</span>
            <span
              className={check.ok ? "font-semibold text-success" : "font-semibold text-warning"}
            >
              {check.value}
            </span>
          </div>
        ))}
      </div>

      <label className="mt-3 flex items-center gap-2 text-sm text-foreground">
        <input
          type="checkbox"
          checked={prepareStaffUpdate}
          onChange={(event) => setPrepareStaffUpdate(event.target.checked)}
          className="h-4 w-4 accent-brand"
        />
        Prepare a staff-app update when published
      </label>

      {hasIssues && (
        <label className="mt-3 flex items-start gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={issuesAcknowledged}
            onChange={(event) => setIssuesAcknowledged(event.target.checked)}
            className="mt-0.5 h-4 w-4 accent-brand"
          />
          <span>
            I have reviewed the open shifts, conflicts, and working-time alerts and still want to{" "}
            {publishActionLabel.toLowerCase()} this manager-approved rota snapshot.
          </span>
        </label>
      )}
    </DialogShell>
  );
}
