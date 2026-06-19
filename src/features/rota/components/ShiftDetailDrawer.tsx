import * as React from "react";
import { Trash2, UserMinus, Save, Copy } from "lucide-react";
import { ActionButton, DrawerShell, FormRow, FormSection, StatusBadge } from "@/components/dl";
import { isValidShiftTimeRange } from "../lib/draftRota";
import type { DraftShift, ShiftId, StaffMember } from "../types";
import type { MaybePromise } from "./grid";

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
  days,
  onClose,
  onUpdate,
  onRemove,
  onMarkOpen,
  onRepeat,
}: {
  shift: DraftShift | null;
  staff: StaffMember[];
  days: DayEntry[];
  onClose: () => void;
  onUpdate: (id: ShiftId, patch: Partial<DraftShift>) => MaybePromise<void>;
  onRemove: (id: ShiftId) => MaybePromise<void>;
  onMarkOpen: (id: ShiftId) => MaybePromise<void>;
  onRepeat: (id: ShiftId, dayIndexes: number[]) => MaybePromise<void>;
}) {
  const [form, setForm] = React.useState<FormState>(() =>
    shift ? formStateFromShift(shift) : { role: "", start: "", end: "", assignTo: "" },
  );
  const [saving, setSaving] = React.useState(false);
  const [repeatMode, setRepeatMode] = React.useState(false);
  const [repeatDays, setRepeatDays] = React.useState<Set<number>>(new Set());

  React.useEffect(() => {
    if (shift) {
      setForm(formStateFromShift(shift));
      setSaving(false);
      setRepeatMode(false);
      setRepeatDays(new Set());
    }
  }, [shift]);

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
  const canSave = !saving && isDirty && form.role.trim() !== "" && timesValid;
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
    try {
      await onUpdate(shift.id, {
        role: form.role.trim(),
        start: form.start,
        end: form.end,
        staffId: nextStaffId,
      });
    } catch {
      // The live persistence hook owns the failure toast; keep the drawer open.
    } finally {
      setSaving(false);
    }
  };

  const runAction = async (action: (id: ShiftId) => MaybePromise<void>) => {
    setSaving(true);
    try {
      await action(shift.id);
    } catch {
      // The live persistence hook owns the failure toast; keep the drawer open.
    } finally {
      setSaving(false);
    }
  };

  const toggleRepeatDay = (idx: number) => {
    setRepeatDays((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const handleRepeatSubmit = async () => {
    if (repeatDays.size === 0) return;
    setSaving(true);
    try {
      await onRepeat(shift.id, Array.from(repeatDays));
    } catch {
      //
    } finally {
      setSaving(false);
      setRepeatMode(false);
      onClose();
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
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} · {s.role}
              </option>
            ))}
          </select>
        </FormRow>
        {saveHint && <p className="text-[11px] text-muted-foreground">{saveHint}</p>}
      </FormSection>

      <FormSection title="Quick actions">
        <div className="flex flex-wrap gap-2">
          {!isOpen && (
            <ActionButton
              variant="secondary"
              size="sm"
              icon={UserMinus}
              disabled={saving || repeatMode}
              onClick={() => void runAction(onMarkOpen)}
            >
              Mark as open shift
            </ActionButton>
          )}
          <ActionButton
            variant="secondary"
            size="sm"
            icon={Copy}
            disabled={saving || repeatMode}
            onClick={() => setRepeatMode(true)}
          >
            Repeat shift...
          </ActionButton>
        </div>
        {!isOpen && !repeatMode && (
          <p className="mt-2 text-[11px] text-muted-foreground">
            To reassign or open up, pick the staff member above and save. Changes stay in the draft
            until published.
          </p>
        )}

        {repeatMode && (
          <div className="mt-3 rounded-xl border border-border bg-muted/20 p-3">
            <div className="mb-2 text-sm font-semibold text-foreground">Repeat this shift on:</div>
            <div className="flex flex-wrap gap-2">
              {days.map((day, idx) => {
                const isSource = shift.dayIndex === idx;
                const isSelected = repeatDays.has(idx);
                return (
                  <label
                    key={idx}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors ${
                      isSource
                        ? "border-transparent text-muted-foreground cursor-not-allowed opacity-50"
                        : isSelected
                          ? "border-brand bg-brand/5 text-brand"
                          : "border-border bg-background hover:border-brand/30 text-foreground"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      disabled={isSource || saving}
                      checked={isSource || isSelected}
                      onChange={() => toggleRepeatDay(idx)}
                    />
                    {day.d}
                  </label>
                );
              })}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <ActionButton
                variant="ghost"
                size="sm"
                onClick={() => {
                  setRepeatMode(false);
                  setRepeatDays(new Set());
                }}
                disabled={saving}
              >
                Cancel
              </ActionButton>
              <ActionButton
                size="sm"
                disabled={repeatDays.size === 0 || saving}
                onClick={() => void handleRepeatSubmit()}
              >
                Confirm repeat
              </ActionButton>
            </div>
          </div>
        )}
      </FormSection>
    </DrawerShell>
  );
}
