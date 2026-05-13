import * as React from "react";
import { Trash2, UserMinus, Save } from "lucide-react";
import { ActionButton, DrawerShell, FormRow, FormSection, StatusBadge } from "@/components/dl";
import { isStartBeforeEnd } from "../lib/draftRota";
import type { DraftShift, ShiftId, StaffMember } from "../types";

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
}: {
  shift: DraftShift | null;
  staff: StaffMember[];
  days: DayEntry[];
  onClose: () => void;
  onUpdate: (id: ShiftId, patch: Partial<DraftShift>) => void;
  onRemove: (id: ShiftId) => void;
  onMarkOpen: (id: ShiftId) => void;
}) {
  const [form, setForm] = React.useState<FormState>(() =>
    shift ? formStateFromShift(shift) : { role: "", start: "", end: "", assignTo: "" },
  );

  React.useEffect(() => {
    if (shift) setForm(formStateFromShift(shift));
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

  const timesValid = isStartBeforeEnd(form.start, form.end);
  const isDirty =
    form.role !== shift.role ||
    form.start !== shift.start ||
    form.end !== shift.end ||
    form.assignTo !== (shift.staffId ?? "");
  const canSave = isDirty && form.role.trim() !== "" && timesValid;

  const handleSave = () => {
    if (!canSave) return;
    const nextStaffId = form.assignTo === "" ? null : form.assignTo;
    onUpdate(shift.id, {
      role: form.role.trim(),
      start: form.start,
      end: form.end,
      staffId: nextStaffId,
    });
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
            onClick={() => onRemove(shift.id)}
            className="text-danger hover:bg-danger-soft/30"
          >
            Remove
          </ActionButton>
          <ActionButton variant="secondary" onClick={onClose}>
            Cancel
          </ActionButton>
          <ActionButton icon={Save} disabled={!canSave} onClick={handleSave}>
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
            className="w-full h-9 rounded-lg border border-border bg-background px-2 text-sm"
          />
        </FormRow>
        <div className="grid grid-cols-2 gap-3">
          <FormRow label="Start" required htmlFor="shift-edit-start">
            <input
              id="shift-edit-start"
              type="time"
              value={form.start}
              onChange={(e) => setForm((prev) => ({ ...prev, start: e.target.value }))}
              className="w-full h-9 rounded-lg border border-border bg-background px-2 text-sm"
            />
          </FormRow>
          <FormRow label="End" required htmlFor="shift-edit-end">
            <input
              id="shift-edit-end"
              type="time"
              value={form.end}
              onChange={(e) => setForm((prev) => ({ ...prev, end: e.target.value }))}
              className="w-full h-9 rounded-lg border border-border bg-background px-2 text-sm"
            />
          </FormRow>
        </div>
        {!timesValid && (
          <p className="text-[11px] text-danger">Enter a valid start and end time.</p>
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
      </FormSection>

      {!isOpen && (
        <FormSection title="Quick actions">
          <div className="flex flex-wrap gap-2">
            <ActionButton
              variant="secondary"
              size="sm"
              icon={UserMinus}
              onClick={() => onMarkOpen(shift.id)}
            >
              Mark as open shift
            </ActionButton>
          </div>
          <p className="text-[11px] text-muted-foreground">
            To reassign or open up, pick the staff member above and save. Changes apply locally and
            stay until you republish.
          </p>
        </FormSection>
      )}
    </DrawerShell>
  );
}
