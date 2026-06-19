import { FormRow, FormSection } from "@/components/dl";
import type { RotaDayIndex, StaffMember } from "../types";

export type AddShiftFormState = {
  dayIndex: RotaDayIndex;
  role: string;
  start: string;
  end: string;
  assignTo: string;
  breakMinutes: number;
  repeat: boolean;
};

export function AddShiftFormFields({
  form,
  setForm,
  days,
  staff,
  roles,
  submitted,
  roleError,
  timeError,
}: {
  form: AddShiftFormState;
  setForm: React.Dispatch<React.SetStateAction<AddShiftFormState>>;
  days: { d: string }[];
  staff: StaffMember[];
  roles: string[];
  submitted: boolean;
  roleError: string;
  timeError: string;
}) {
  const roleErrorId = "add-shift-role-error";
  const timeErrorId = "add-shift-time-error";

  return (
    <FormSection title="Shift">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FormRow label="Staff" htmlFor="add-shift-assign">
          <select
            id="add-shift-assign"
            value={form.assignTo}
            onChange={(event) =>
              setForm((current) => ({ ...current, assignTo: event.target.value }))
            }
            className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm"
          >
            <option value="">Open shift (no one yet)</option>
            {staff.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </FormRow>

        <FormRow label="Role" required htmlFor="add-shift-role">
          <select
            id="add-shift-role"
            value={form.role}
            onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}
            aria-invalid={submitted && Boolean(roleError)}
            aria-describedby={submitted && roleError ? roleErrorId : undefined}
            className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm"
          >
            <option value="">Select a role…</option>
            {roles.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
          {submitted && roleError && (
            <p id={roleErrorId} className="mt-1 text-[11px] text-danger">
              {roleError}
            </p>
          )}
        </FormRow>

        <FormRow label="Day" required htmlFor="add-shift-day">
          <select
            id="add-shift-day"
            value={form.dayIndex}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                dayIndex: Number(event.target.value) as RotaDayIndex,
              }))
            }
            className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm"
          >
            {days.map((day, index) => (
              <option key={day.d} value={index}>
                {day.d}
              </option>
            ))}
          </select>
        </FormRow>

        <FormRow label="Break" htmlFor="add-shift-break">
          <select
            id="add-shift-break"
            value={form.breakMinutes}
            onChange={(event) =>
              setForm((current) => ({ ...current, breakMinutes: Number(event.target.value) }))
            }
            className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm"
          >
            <option value={30}>30 min unpaid</option>
            <option value={15}>15 min unpaid</option>
            <option value={0}>None</option>
          </select>
        </FormRow>

        <FormRow label="Start" required htmlFor="add-shift-start">
          <input
            id="add-shift-start"
            type="time"
            value={form.start}
            onChange={(event) => setForm((current) => ({ ...current, start: event.target.value }))}
            aria-invalid={submitted && Boolean(timeError)}
            aria-describedby={submitted && timeError ? timeErrorId : undefined}
            className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm"
          />
        </FormRow>

        <FormRow label="End" required htmlFor="add-shift-end">
          <input
            id="add-shift-end"
            type="time"
            value={form.end}
            onChange={(event) => setForm((current) => ({ ...current, end: event.target.value }))}
            aria-invalid={submitted && Boolean(timeError)}
            aria-describedby={submitted && timeError ? timeErrorId : undefined}
            className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm"
          />
        </FormRow>
      </div>

      {submitted && timeError && (
        <p id={timeErrorId} className="text-[11px] text-danger">
          {timeError}
        </p>
      )}

      <label className="flex items-center gap-2 text-sm text-foreground">
        <input
          type="checkbox"
          checked={form.repeat}
          onChange={(event) => setForm((current) => ({ ...current, repeat: event.target.checked }))}
          className="h-4 w-4 accent-brand"
        />
        Repeat this shift for the rest of the week
      </label>
    </FormSection>
  );
}
