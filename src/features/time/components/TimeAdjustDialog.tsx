import { DialogShell, ActionButton, FormRow } from "@/components/dl";
import { Check, Edit3 } from "lucide-react";
import { toast } from "sonner";
import type { TimesheetRow } from "../types";

interface Props {
  row: TimesheetRow | null;
  onClose: () => void;
}

/** Manual timesheet adjustment modal — prototype parity. Demo-only, changes are not persisted. */
export function TimeAdjustDialog({ row, onClose }: Props) {
  if (!row) return null;

  const handleSave = () => {
    onClose();
    toast.success("Adjustment saved", {
      description: `${row.n}'s timesheet has been updated.`,
    });
  };

  return (
    <DialogShell
      open={!!row}
      onOpenChange={(o) => !o && onClose()}
      title={`Adjust ${row.n}'s timesheet`}
      description="Manual changes are tracked in the audit log."
      icon={Edit3}
      iconTone="warning"
      footer={
        <>
          <ActionButton variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </ActionButton>
          <ActionButton size="sm" onClick={handleSave}>
            <Check className="mr-1.5 h-3.5 w-3.5" /> Save adjustment
          </ActionButton>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <FormRow label={`Clock in (was ${row.in})`} htmlFor="adjust-clock-in">
          <input
            id="adjust-clock-in"
            className="input mono"
            defaultValue={row.in === "—" ? "08:00" : row.in}
          />
        </FormRow>
        <FormRow label={`Clock out (was ${row.out})`} htmlFor="adjust-clock-out">
          <input id="adjust-clock-out" className="input mono" defaultValue={row.out} />
        </FormRow>
        <FormRow label="Breaks (unpaid)" htmlFor="adjust-breaks">
          <select id="adjust-breaks" className="select" defaultValue={row.brk}>
            {["0:00", "0:15", "0:30", "0:45", "1:00"].map((b) => (
              <option key={b}>{b}</option>
            ))}
          </select>
        </FormRow>
        <FormRow label="Reason" htmlFor="adjust-reason">
          <select id="adjust-reason" className="select">
            <option>Forgot to clock in/out</option>
            <option>Device issue</option>
            <option>Manager correction</option>
            <option>Other</option>
          </select>
        </FormRow>
        <div className="col-span-2">
          <FormRow label="Note (visible to staff)" htmlFor="adjust-note">
            <textarea
              id="adjust-note"
              className="textarea w-full"
              rows={2}
              placeholder="Adjusted clock-in to match scheduled start — device was offline."
            />
          </FormRow>
        </div>
      </div>
    </DialogShell>
  );
}
