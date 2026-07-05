import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Plus } from "lucide-react";
import { DialogShell, ActionButton, FormRow } from "@/components/dl";
import { fetchWorkspaceStaffFn } from "@/features/staff/api/staffLiveData";
import { BREAK_OPTIONS } from "../lib/adjustTime";
import { prepareManualEntry, type ManualEntryPayload } from "../lib/manualEntry";
import { londonDateIso } from "../lib/reviewPeriod";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Live workspace only — the dialog is never rendered in demo mode. */
  workspaceId: string;
  isSaving: boolean;
  /** Resolves true when the entry was recorded; the dialog then closes. */
  onSave: (payload: ManualEntryPayload, staffName: string) => Promise<boolean>;
}

/**
 * Manager-side manual time entry: record actual worked time for a staff member
 * so it can be reviewed, approved, and exported as approved hours. Reuses the
 * live staff roster read for the picker and the shared HH:MM / break parsing
 * used by the adjustment path.
 */
export function TimeAddEntryDialog({ open, onClose, workspaceId, isSaving, onSave }: Props) {
  const [staffMemberId, setStaffMemberId] = React.useState("");
  const [workDate, setWorkDate] = React.useState(() => londonDateIso(new Date()));
  const [clockIn, setClockIn] = React.useState("");
  const [clockOut, setClockOut] = React.useState("");
  const [breakTime, setBreakTime] = React.useState<string>("0:00");
  const [note, setNote] = React.useState("");

  const roster = useQuery({
    queryKey: ["staff", "workspace-roster", workspaceId],
    queryFn: () => fetchWorkspaceStaffFn(),
    enabled: open,
    staleTime: 30_000,
  });
  const staff = roster.data ?? [];

  React.useEffect(() => {
    if (!open) return;
    setStaffMemberId("");
    setWorkDate(londonDateIso(new Date()));
    setClockIn("");
    setClockOut("");
    setBreakTime("0:00");
    setNote("");
  }, [open]);

  const handleSave = async () => {
    const prepared = prepareManualEntry({
      staffMemberId,
      workDate,
      clockIn,
      clockOut,
      breakTime,
      note,
    });
    if (!prepared.ok) {
      toast.error("Check the entry", { description: prepared.message });
      return;
    }
    const staffName = staff.find((s) => s.id === staffMemberId)?.name ?? "Team member";
    const saved = await onSave(prepared.payload, staffName);
    if (saved) onClose();
  };

  return (
    <DialogShell
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title="Add time entry"
      description="Record actual worked time for review. It starts as pending and counts toward approved hours once approved."
      icon={Plus}
      footer={
        <>
          <ActionButton variant="ghost" size="sm" onClick={onClose} disabled={isSaving}>
            Cancel
          </ActionButton>
          <ActionButton size="sm" onClick={() => void handleSave()} disabled={isSaving}>
            <Check className="mr-1.5 h-3.5 w-3.5" /> {isSaving ? "Recording…" : "Record entry"}
          </ActionButton>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <FormRow label="Staff member" htmlFor="add-entry-staff" required>
            <select
              id="add-entry-staff"
              className="select w-full"
              value={staffMemberId}
              onChange={(event) => setStaffMemberId(event.target.value)}
              disabled={roster.isLoading}
            >
              <option value="">
                {roster.isLoading ? "Loading staff…" : "Choose a staff member"}
              </option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </FormRow>
          {roster.isSuccess && staff.length === 0 && (
            <p className="mt-1 text-[11px] text-muted-foreground">
              No staff in this workspace yet — add staff first, then record their time.
            </p>
          )}
        </div>
        <FormRow label="Date" htmlFor="add-entry-date" required>
          <input
            id="add-entry-date"
            type="date"
            className="input"
            value={workDate}
            onChange={(event) => setWorkDate(event.target.value)}
          />
        </FormRow>
        <FormRow label="Breaks (unpaid)" htmlFor="add-entry-break">
          <select
            id="add-entry-break"
            className="select"
            value={breakTime}
            onChange={(event) => setBreakTime(event.target.value)}
          >
            {BREAK_OPTIONS.map((b) => (
              <option key={b}>{b}</option>
            ))}
          </select>
        </FormRow>
        <FormRow label="Clock in" htmlFor="add-entry-clock-in" required>
          <input
            id="add-entry-clock-in"
            className="input mono"
            placeholder="09:00"
            value={clockIn}
            onChange={(event) => setClockIn(event.target.value)}
          />
        </FormRow>
        <FormRow label="Clock out" htmlFor="add-entry-clock-out" required>
          <input
            id="add-entry-clock-out"
            className="input mono"
            placeholder="17:00"
            value={clockOut}
            onChange={(event) => setClockOut(event.target.value)}
          />
        </FormRow>
        <div className="col-span-2">
          <FormRow label="Note (kept on the entry's audit trail)" htmlFor="add-entry-note">
            <textarea
              id="add-entry-note"
              className="textarea w-full"
              rows={2}
              placeholder="Recorded from the paper timesheet — clock device not set up yet."
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </FormRow>
        </div>
      </div>
    </DialogShell>
  );
}
