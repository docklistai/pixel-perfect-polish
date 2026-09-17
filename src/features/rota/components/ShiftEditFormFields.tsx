import { FormRow } from "@/components/dl";
import type { StaffMember } from "../types";
import { isStaffEligibleForRole } from "../lib/assignableStaff";
import { normaliseRoleKey } from "../lib/scheduling/shiftSignature";

export type ShiftEditFormState = {
  role: string;
  start: string;
  end: string;
  assignTo: string;
};

export function ShiftEditFormFields({
  form,
  setForm,
  assignableStaff,
  currentStaff,
  currentAssignmentIsAssignable,
  timesValid,
  saveHint,
  originalStaffId,
}: {
  form: ShiftEditFormState;
  setForm: React.Dispatch<React.SetStateAction<ShiftEditFormState>>;
  assignableStaff: StaffMember[];
  currentStaff: StaffMember | undefined;
  currentAssignmentIsAssignable: boolean;
  timesValid: boolean;
  saveHint: string;
  originalStaffId: string | null;
}) {
  const timeErrorId = "shift-edit-time-error";
  const roleErrorId = "shift-edit-role-error";

  const assignedStaffMember = form.assignTo
    ? assignableStaff.find((s) => s.id === form.assignTo)
    : undefined;
  const isAssignedEligible =
    !assignedStaffMember || isStaffEligibleForRole(assignedStaffMember, form.role);

  return (
    <>
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
          {assignableStaff.map((s) => {
            const isPrimary = normaliseRoleKey(s.role) === normaliseRoleKey(form.role);
            const isEligible = isStaffEligibleForRole(s, form.role);
            const label = isPrimary
              ? `${s.name} · ${s.role}`
              : isEligible
                ? `${s.name} · ${s.role} (eligible)`
                : `${s.name} · ${s.role} (not eligible)`;
            return (
              <option key={s.id} value={s.id} disabled={!isEligible}>
                {label}
              </option>
            );
          })}
        </select>
      </FormRow>
      {!currentAssignmentIsAssignable && form.assignTo === originalStaffId && (
        <p className="text-[11px] text-warning">
          This staff member is no longer active. Reassign the shift or mark it open before saving.
        </p>
      )}
      {!isAssignedEligible && assignedStaffMember && (
        <p className="text-[11px] text-danger">
          {assignedStaffMember.name} is not eligible for the {form.role} role. Choose an eligible
          staff member or configure this role under Staff.
        </p>
      )}
      {saveHint && <p className="text-[11px] text-muted-foreground">{saveHint}</p>}
    </>
  );
}
