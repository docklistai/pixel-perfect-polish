import * as React from "react";
import { DialogShell, ActionButton, FormRow } from "@/components/dl";
import { Check, Edit3 } from "lucide-react";
import type { StoredTimesheetRow, TimeAdjustment } from "../types";

interface Props {
  row: StoredTimesheetRow | null;
  onClose: () => void;
  onSave: (row: StoredTimesheetRow, adjustment: TimeAdjustment) => void;
}

export function TimeAdjustDialog({ row, onClose, onSave }: Props) {
  const [clockIn, setClockIn] = React.useState("08:00");
  const [clockOut, setClockOut] = React.useState("16:00");
  const [breakTime, setBreakTime] = React.useState("0:30");
  const [reason, setReason] = React.useState("Forgot to clock in/out");
  const [note, setNote] = React.useState("");

  React.useEffect(() => {
    if (!row) return;
    setClockIn(row.in === "—" ? "08:00" : row.in);
    setClockOut(row.out);
    setBreakTime(row.brk);
    setNote("");
  }, [row]);

  if (!row) return null;

  const handleSave = () => {
    onSave(row, { clockIn, clockOut, breakTime, reason, note });
    onClose();
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
            value={clockIn}
            onChange={(event) => setClockIn(event.target.value)}
          />
        </FormRow>
        <FormRow label={`Clock out (was ${row.out})`} htmlFor="adjust-clock-out">
          <input
            id="adjust-clock-out"
            className="input mono"
            value={clockOut}
            onChange={(event) => setClockOut(event.target.value)}
          />
        </FormRow>
        <FormRow label="Breaks (unpaid)" htmlFor="adjust-breaks">
          <select
            id="adjust-breaks"
            className="select"
            value={breakTime}
            onChange={(event) => setBreakTime(event.target.value)}
          >
            {["0:00", "0:15", "0:30", "0:45", "1:00"].map((b) => (
              <option key={b}>{b}</option>
            ))}
          </select>
        </FormRow>
        <FormRow label="Reason" htmlFor="adjust-reason">
          <select
            id="adjust-reason"
            className="select"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          >
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
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </FormRow>
        </div>
      </div>
    </DialogShell>
  );
}
