import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarOff } from "lucide-react";
import { ActionButton, DialogShell } from "@/components/dl";
import { fetchWorkspaceStaffFn } from "@/features/staff/api/staffLiveData";
import {
  MANAGER_ABSENCE_TYPES,
  MANAGER_ABSENCE_TYPE_LABELS,
  type ManagerAbsenceType,
} from "../api/recordAbsence";
import { useRecordAbsence } from "../hooks/useRecordAbsence";

interface RecordAbsenceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string | null;
  /** Preselects a person when opened from a rota cell or a staff profile. */
  defaultStaffMemberId?: string;
  /** Preselects the day when opened from a rota cell. */
  defaultStartDate?: string;
}

function todayIso(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

/**
 * The single manager create-absence surface. Leave, Rota and the staff profile
 * all render this component — there is no per-route implementation.
 */
export function RecordAbsenceDialog({
  open,
  onOpenChange,
  workspaceId,
  defaultStaffMemberId,
  defaultStartDate,
}: RecordAbsenceDialogProps) {
  // Fetched here rather than passed in, so every entry point shares one roster
  // read and no route needs its own staff wiring.
  const staffQuery = useQuery({
    queryKey: ["staff", "workspace-roster", workspaceId],
    queryFn: () => fetchWorkspaceStaffFn(),
    enabled: open && Boolean(workspaceId),
    staleTime: 30_000,
  });
  const staff = React.useMemo(
    () =>
      (staffQuery.data ?? [])
        .filter((row) => row.active === true)
        .map((row) => ({ id: row.id, displayName: row.name })),
    [staffQuery.data],
  );

  const [staffMemberId, setStaffMemberId] = React.useState("");
  const [leaveType, setLeaveType] = React.useState<ManagerAbsenceType>("sick");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [reason, setReason] = React.useState("");

  const { recordAbsence, recording } = useRecordAbsence(workspaceId, () => onOpenChange(false));

  // Reset to the caller's context each time the dialog opens.
  React.useEffect(() => {
    if (!open) return;
    const day = defaultStartDate ?? todayIso();
    setStaffMemberId(defaultStaffMemberId ?? "");
    setLeaveType("sick");
    setStartDate(day);
    setEndDate(day);
    setReason("");
  }, [open, defaultStaffMemberId, defaultStartDate]);

  const datesValid = Boolean(startDate) && Boolean(endDate) && endDate >= startDate;
  const canSubmit =
    Boolean(workspaceId) &&
    Boolean(staffMemberId) &&
    datesValid &&
    reason.trim().length > 0 &&
    !recording;

  const submit = () => {
    if (!canSubmit) return;
    recordAbsence({
      staffMemberId,
      leaveType,
      startDate,
      endDate,
      reason: reason.trim(),
    });
  };

  return (
    <DialogShell
      open={open}
      onOpenChange={onOpenChange}
      title="Record an absence"
      description="Records approved leave straight away — for a call-in you already accepted. Rota shifts are never changed automatically."
      icon={CalendarOff}
      size="md"
      footer={
        <>
          <ActionButton variant="ghost" onClick={() => onOpenChange(false)} disabled={recording}>
            Cancel
          </ActionButton>
          <ActionButton onClick={submit} disabled={!canSubmit}>
            {recording ? "Recording…" : "Record absence"}
          </ActionButton>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Staff member</span>
          <select
            className="input"
            value={staffMemberId}
            onChange={(event) => setStaffMemberId(event.target.value)}
            disabled={recording}
          >
            <option value="">Choose someone…</option>
            {staff.map((person) => (
              <option key={person.id} value={person.id}>
                {person.displayName}
              </option>
            ))}
          </select>
          {staffQuery.isLoading && (
            <span className="text-xs text-muted-foreground">Loading your team…</span>
          )}
          {!staffQuery.isLoading && staff.length === 0 && (
            <span className="text-xs text-muted-foreground">
              No active staff to record an absence for yet.
            </span>
          )}
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Type</span>
          <select
            className="input"
            value={leaveType}
            onChange={(event) => setLeaveType(event.target.value as ManagerAbsenceType)}
            disabled={recording}
          >
            {MANAGER_ABSENCE_TYPES.map((type) => (
              <option key={type} value={type}>
                {MANAGER_ABSENCE_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">First day</span>
            <input
              type="date"
              className="input"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              disabled={recording}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Last day</span>
            <input
              type="date"
              className="input"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              disabled={recording}
            />
          </label>
        </div>
        {!datesValid && startDate && endDate && (
          <p className="text-xs text-danger">The last day can&apos;t be before the first day.</p>
        )}

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Reason</span>
          <textarea
            className="input min-h-[72px]"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={2000}
            placeholder="Phoned in with flu"
            disabled={recording}
          />
        </label>
      </div>
    </DialogShell>
  );
}
