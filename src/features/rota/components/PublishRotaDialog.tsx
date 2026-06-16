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
  onConfirm: (prepareStaffUpdate: boolean) => MaybePromise<void>;
}) {
  const [prepareStaffUpdate, setPrepareStaffUpdate] = React.useState(true);
  const [publishing, setPublishing] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setPrepareStaffUpdate(true);
      setPublishing(false);
    }
  }, [open]);

  const handleConfirm = async () => {
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
      title="Publish this rota?"
      description={`${weekLabel} · ${staffCount} staff`}
      icon={Send}
      footer={
        <>
          <ActionButton variant="ghost" disabled={publishing} onClick={() => onOpenChange(false)}>
            Cancel
          </ActionButton>
          <ActionButton icon={Send} disabled={publishing} onClick={() => void handleConfirm()}>
            Publish to {staffCount} staff
          </ActionButton>
        </>
      }
    >
      <p>
        Staff see only the published snapshot in the Docklist mobile portal. Any draft edits made
        after publishing stay manager-only until you publish again.
      </p>

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
    </DialogShell>
  );
}
