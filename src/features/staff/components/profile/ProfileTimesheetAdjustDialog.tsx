import { ActionButton, DialogShell } from "@/components/dl";
import { Check, Clock, Info } from "lucide-react";

export interface ProfileTimesheetRow {
  day: string;
  scheduled: string;
  actual: string;
  hours: number;
  status: "pending" | "flagged" | "approved";
  note: string | null;
}

interface Props {
  profileName: string;
  row: ProfileTimesheetRow | null;
  onOpenChange: (open: boolean) => void;
  onApprove: () => void;
}

export function ProfileTimesheetAdjustDialog({ profileName, row, onOpenChange, onApprove }: Props) {
  const [clockIn = "", clockOut = ""] = row?.actual.split(" – ") ?? [];

  return (
    <DialogShell
      open={Boolean(row)}
      onOpenChange={onOpenChange}
      title="Adjust timesheet"
      description={row ? `${profileName} · ${row.day}` : undefined}
      icon={Clock}
      iconTone="warning"
      footer={
        <>
          <ActionButton variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </ActionButton>
          <ActionButton size="sm" onClick={onApprove}>
            <Check className="h-3 w-3" aria-hidden /> Approve adjusted
          </ActionButton>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <div className="field">
          <label htmlFor="timesheet-clock-in">Clock in</label>
          <input id="timesheet-clock-in" className="dl-input mono" defaultValue={clockIn} />
        </div>
        <div className="field">
          <label htmlFor="timesheet-clock-out">Clock out</label>
          <input id="timesheet-clock-out" className="dl-input mono" defaultValue={clockOut} />
        </div>
        <div className="field">
          <label htmlFor="timesheet-break">Break (min)</label>
          <input id="timesheet-break" className="dl-input mono" defaultValue="30" />
        </div>
        <div className="field">
          <label htmlFor="timesheet-hours">Final hours</label>
          <div className="input-group">
            <input
              id="timesheet-hours"
              className="mono"
              defaultValue={row?.hours.toFixed(2) ?? ""}
            />
            <span className="muted">h</span>
          </div>
        </div>
        <div className="field col-span-2">
          <label htmlFor="timesheet-reason-select">Reason category</label>
          <select
            id="timesheet-reason-select"
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-brand"
          >
            <option value="worked-late">Worked late (approved by manager)</option>
            <option value="forgot-swipe">Forgot to clock in/out</option>
            <option value="early-dismiss">Early dismissal (business slow)</option>
            <option value="break-adjust">Unplanned break deviation</option>
            <option value="other">Other (explain in notes below)</option>
          </select>
        </div>
        <div className="field col-span-2">
          <label htmlFor="timesheet-reason">Audit notes</label>
          <textarea
            id="timesheet-reason"
            className="dl-textarea"
            rows={2}
            defaultValue="Worked late for Bennett dinner — confirmed by Sophie."
          />
        </div>
      </div>
      <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Info className="h-3 w-3" aria-hidden />
        Adjustments are visible on the staff record and in audit.
      </div>
    </DialogShell>
  );
}
