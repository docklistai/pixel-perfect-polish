import * as React from "react";
import { Trash2, UserMinus, Save, UserPlus } from "lucide-react";
import { ActionButton, DrawerShell, FormRow, FormSection, StatusBadge } from "@/components/dl";
import type { LeaveRequest } from "@/features/leave/types";
import { isValidShiftTimeRange } from "../lib/draftRota";
import type { RepeatShiftResult } from "../lib/repeatShift";
import type { DraftShift, ShiftId, StaffMember } from "../types";
import { buildRotaRecoveryOptions, NO_SAFE_RECOVERY_OPTIONS } from "../lib/rotaRecoveryOptions";
import type { MaybePromise } from "./grid";
import { RepeatShiftControls } from "./RepeatShiftControls";

type DayEntry = { d: string };

type FormState = {
  role: string;
  start: string;
  end: string;
  assignTo: string;
};

function formStateFromShift(shift: DraftShift): FormState {
  return {
    role: shift.role,
    start: shift.start,
    end: shift.end,
    assignTo: shift.staffId ?? "",
  };
}

export function ShiftDetailDrawer({
  shift,
  staff,
  assignableStaff,
  days,
  onClose,
  onUpdate,
  onRemove,
  onMarkOpen,
  onRepeat,
  draftShifts,
  leaveRequests,
  dayIsoDates,
  suggestedAssignTo,
}: {
  shift: DraftShift | null;
  staff: StaffMember[];
  assignableStaff: StaffMember[];
  days: DayEntry[];
  onClose: () => void;
  onUpdate: (id: ShiftId, patch: Partial<DraftShift>) => MaybePromise<void>;
  onRemove: (id: ShiftId) => MaybePromise<void>;
  onMarkOpen: (id: ShiftId) => MaybePromise<void>;
  onRepeat: (id: ShiftId, dayIndexes: number[]) => Promise<RepeatShiftResult | null>;
  draftShifts: DraftShift[];
  leaveRequests: LeaveRequest[];
  dayIsoDates: string[];
  suggestedAssignTo?: string | null;
}) {
  const [form, setForm] = React.useState<FormState>(() =>
    shift ? formStateFromShift(shift) : { role: "", start: "", end: "", assignTo: "" },
  );
  const [saving, setSaving] = React.useState(false);
  const [repeatActive, setRepeatActive] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (shift) {
      setForm(formStateFromShift(shift));
      setSaving(false);
      setRepeatActive(false);
      setSaveError(null);
    }
  }, [shift]);

  React.useEffect(() => {
    if (!shift || !suggestedAssignTo) return;
    setForm((current) =>
      current.assignTo === suggestedAssignTo
        ? current
        : { ...current, assignTo: suggestedAssignTo },
    );
  }, [shift, suggestedAssignTo]);

  const recoveryOptions = React.useMemo(() => {
    if (!shift) return [];
    const isOpen = shift.staffId === null;
    const isConflict = shift.status === "conflict";
    if (!isOpen && !isConflict) return [];
    return buildRotaRecoveryOptions({
      shift,
      staff: assignableStaff,
      shifts: draftShifts,
      leaveRequests,
      dayIsoDates,
      excludeStaffId: shift.staffId,
    });
  }, [assignableStaff, dayIsoDates, draftShifts, leaveRequests, shift]);
  if (!shift) {
    return (
      <DrawerShell open={false} onOpenChange={(o) => !o && onClose()} title="Shift">
        <p className="text-xs text-muted-foreground">No shift selected.</p>
      </DrawerShell>
    );
  }

  const isOpen = shift.staffId === null;
  const isConflict = shift.status === "conflict";
  const dayLabel = days[shift.dayIndex]?.d ?? "";
  const staffName = isOpen
    ? "Open shift"
    : (staff.find((s) => s.id === shift.staffId)?.name ?? "Unknown");
  const currentStaff = staff.find((member) => member.id === shift.staffId);
  const currentAssignmentIsAssignable =
    shift.staffId === null || assignableStaff.some((member) => member.id === shift.staffId);
  const meta = isConflict ? (
    <StatusBadge tone="warning">Conflict</StatusBadge>
  ) : isOpen ? (
    <StatusBadge tone="info">Open shift</StatusBadge>
  ) : (
    <StatusBadge tone="success">Scheduled</StatusBadge>
  );

  const timesValid = isValidShiftTimeRange(form.start, form.end);
  const isDirty =
    form.role !== shift.role ||
    form.start !== shift.start ||
    form.end !== shift.end ||
    form.assignTo !== (shift.staffId ?? "");
  const hasValidAssignment =
    form.assignTo === "" || assignableStaff.some((member) => member.id === form.assignTo);
  const canSave = !saving && isDirty && form.role.trim() !== "" && timesValid && hasValidAssignment;
  const timeErrorId = "shift-edit-time-error";
  const roleErrorId = "shift-edit-role-error";
  const saveHint = !isDirty
    ? "Make a change to enable Save."
    : !form.role.trim()
      ? "Enter a role to save."
      : !timesValid
        ? "Enter a valid time range to save."
        : "";

  const handleSave = async () => {
    if (!canSave) return;
    const nextStaffId = form.assignTo === "" ? null : form.assignTo;
    setSaving(true);
    setSaveError(null);
    try {
      await onUpdate(shift.id, {
        role: form.role.trim(),
        start: form.start,
        end: form.end,
        staffId: nextStaffId,
      });
    } catch (error) {
      // The live persistence hook also raises a toast; keep the drawer open with
      // the entered fields and show the reason inline so the manager can retry.
      setSaveError(
        error instanceof Error && error.message
          ? error.message
          : "We couldn't save this shift. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  const runAction = async (action: (id: ShiftId) => MaybePromise<void>) => {
    setSaving(true);
    setSaveError(null);
    try {
      await action(shift.id);
    } catch (error) {
      setSaveError(
        error instanceof Error && error.message
          ? error.message
          : "We couldn't update this shift. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <DrawerShell
      open
      onOpenChange={(o) => !o && onClose()}
      title={staffName}
      description={`${dayLabel} · ${shift.role}`}
      meta={meta}
      footer={
        <>
          <ActionButton
            variant="ghost"
            icon={Trash2}
            disabled={saving}
            onClick={() => void runAction(onRemove)}
            className="text-danger hover:bg-danger-soft/30"
          >
            Remove
          </ActionButton>
          <ActionButton variant="secondary" disabled={saving} onClick={onClose}>
            Cancel
          </ActionButton>
          <ActionButton icon={Save} disabled={!canSave} onClick={() => void handleSave()}>
            Save
          </ActionButton>
        </>
      }
    >
      <FormSection title="Edit shift">
        {saveError && (
          <div
            role="alert"
            className="rounded-xl border border-danger/30 bg-danger-soft px-3 py-2 text-xs text-danger"
          >
            {saveError}
          </div>
        )}
        <FormRow label="Role" required htmlFor="shift-edit-role">
          <input
            id="shift-edit-role"
            type="text"
            value={form.role}
            onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}
            aria-invalid={!form.role.trim()}
            aria-describedby={!form.role.trim() ? roleErrorId : undefined}
            className="w-full h-9 rounded-lg border border-border bg-background px-2 text-sm"
          />
          {!form.role.trim() && (
            <p id={roleErrorId} className="mt-1 text-[11px] text-danger">
              Enter a role.
            </p>
          )}
        </FormRow>
        <div className="grid grid-cols-2 gap-3">
          <FormRow label="Start time" required htmlFor="shift-edit-start">
            <input
              id="shift-edit-start"
              type="time"
              value={form.start}
              onChange={(e) => setForm((prev) => ({ ...prev, start: e.target.value }))}
              aria-invalid={!timesValid}
              aria-describedby={!timesValid ? timeErrorId : undefined}
              className="w-full h-9 rounded-lg border border-border bg-background px-2 text-sm"
            />
          </FormRow>
          <FormRow label="End time" required htmlFor="shift-edit-end">
            <input
              id="shift-edit-end"
              type="time"
              value={form.end}
              onChange={(e) => setForm((prev) => ({ ...prev, end: e.target.value }))}
              aria-invalid={!timesValid}
              aria-describedby={!timesValid ? timeErrorId : undefined}
              className="w-full h-9 rounded-lg border border-border bg-background px-2 text-sm"
            />
          </FormRow>
        </div>
        {!timesValid && (
          <p id={timeErrorId} className="text-[11px] text-danger">
            Enter a valid shift time. Overnight shifts are allowed.
          </p>
        )}
        <FormRow
          label="Assigned to"
          hint="Choose a staff member or leave as open shift."
          htmlFor="shift-edit-assign"
        >
          <select
            id="shift-edit-assign"
            value={form.assignTo}
            onChange={(e) => setForm((prev) => ({ ...prev, assignTo: e.target.value }))}
            className="w-full h-9 rounded-lg border border-border bg-background px-2 text-sm"
          >
            <option value="">Open shift (unassigned)</option>
            {!currentAssignmentIsAssignable && currentStaff && (
              <option value={currentStaff.id} disabled>
                {currentStaff.name} · inactive — reassign or mark open
              </option>
            )}
            {assignableStaff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} · {s.role}
              </option>
            ))}
          </select>
        </FormRow>
        {!currentAssignmentIsAssignable && form.assignTo === shift.staffId && (
          <p className="text-[11px] text-warning">
            This staff member is no longer active. Reassign the shift or mark it open before saving.
          </p>
        )}
        {saveHint && <p className="text-[11px] text-muted-foreground">{saveHint}</p>}
      </FormSection>

      {(isOpen || isConflict) && (
        <FormSection title="Recovery options">
          {recoveryOptions.length > 0 ? (
            <div className="space-y-2">
              {recoveryOptions.map((option) => (
                <div
                  key={option.staffId}
                  className="flex items-start justify-between gap-3 rounded-xl border border-border bg-muted/25 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{option.staffName}</div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">{option.note}</div>
                  </div>
                  <ActionButton
                    variant="secondary"
                    size="sm"
                    icon={UserPlus}
                    onClick={() => setForm((current) => ({ ...current, assignTo: option.staffId }))}
                  >
                    Use
                  </ActionButton>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">{NO_SAFE_RECOVERY_OPTIONS}</p>
          )}
          <p className="text-[11px] text-muted-foreground">
            This fills the assignment field only. Save is still required.
          </p>
        </FormSection>
      )}

      <FormSection title="Quick actions">
        <div className="flex flex-wrap gap-2">
          {!isOpen && (
            <ActionButton
              variant="secondary"
              size="sm"
              icon={UserMinus}
              disabled={saving || repeatActive}
              onClick={() => void runAction(onMarkOpen)}
            >
              Mark as open shift
            </ActionButton>
          )}
          <RepeatShiftControls
            sourceDayIndex={shift.dayIndex}
            days={days}
            disabled={saving}
            copyAllowed={currentAssignmentIsAssignable}
            onActiveChange={setRepeatActive}
            onBusyChange={setSaving}
            onRepeat={(dayIndexes) => onRepeat(shift.id, dayIndexes)}
            onSuccess={onClose}
          />
        </div>
        {!isOpen && !repeatActive && (
          <p className="mt-2 text-[11px] text-muted-foreground">
            To reassign or open up, pick the staff member above and save. Changes stay in the draft
            until published.
          </p>
        )}
      </FormSection>
    </DrawerShell>
  );
}
