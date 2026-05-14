import * as React from "react";
import { DrawerShell, FormSection, FormRow, ActionButton } from "@/components/dl";
import { isValidShiftTimeRange } from "../lib/draftRota";
import type { DraftShiftInput, RotaDayIndex, StaffMember } from "../types";

type DayEntry = { d: string };

type FormState = {
  dayIndex: RotaDayIndex;
  role: string;
  start: string;
  end: string;
  assignTo: string; // "" means open shift; otherwise StaffId
};

const DEFAULT_FORM: FormState = {
  dayIndex: 0,
  role: "",
  start: "17:00",
  end: "23:00",
  assignTo: "",
};

export function AddShiftDrawer({
  open,
  onOpenChange,
  days,
  staff,
  roles,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  days: DayEntry[];
  staff: StaffMember[];
  roles: string[];
  onSubmit: (input: DraftShiftInput) => void;
}) {
  const initialForm = React.useMemo<FormState>(
    () => ({ ...DEFAULT_FORM, role: roles[0] ?? "" }),
    [roles],
  );
  const [form, setForm] = React.useState<FormState>(initialForm);
  const [submitted, setSubmitted] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setForm(initialForm);
      setSubmitted(false);
    }
  }, [open, initialForm]);

  const errors = {
    role: !form.role ? "Choose a role" : "",
    start: !form.start ? "Required" : "",
    end: !form.end ? "Required" : "",
    timeOrder:
      form.start && form.end && !isValidShiftTimeRange(form.start, form.end)
        ? "Enter a valid shift time. Overnight shifts are allowed."
        : "",
  };
  const hasError = Boolean(errors.role || errors.start || errors.end || errors.timeOrder);
  const timeErrorId = "add-shift-time-error";
  const roleErrorId = "add-shift-role-error";

  const handleSave = () => {
    setSubmitted(true);
    if (hasError) return;
    onSubmit({
      dayIndex: form.dayIndex,
      staffId: form.assignTo === "" ? null : form.assignTo,
      role: form.role,
      start: form.start,
      end: form.end,
    });
    onOpenChange(false);
  };

  return (
    <DrawerShell
      open={open}
      onOpenChange={onOpenChange}
      title="Add shift"
      description="Create a one-off assigned or open shift for this week."
      footer={
        <>
          <ActionButton variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </ActionButton>
          <ActionButton onClick={handleSave}>Add to draft</ActionButton>
        </>
      }
    >
      <FormSection title="Shift">
        <FormRow label="Day" required htmlFor="add-shift-day">
          <select
            id="add-shift-day"
            value={form.dayIndex}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                dayIndex: Number(e.target.value) as RotaDayIndex,
              }))
            }
            className="w-full h-9 rounded-lg border border-border bg-background px-2 text-sm"
          >
            {days.map((d, i) => (
              <option key={d.d} value={i}>
                {d.d}
              </option>
            ))}
          </select>
        </FormRow>

        <FormRow label="Role" required htmlFor="add-shift-role">
          <select
            id="add-shift-role"
            value={form.role}
            onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}
            aria-invalid={submitted && Boolean(errors.role)}
            aria-describedby={submitted && errors.role ? roleErrorId : undefined}
            className="w-full h-9 rounded-lg border border-border bg-background px-2 text-sm"
          >
            <option value="">Select a role…</option>
            {roles.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          {submitted && errors.role && (
            <p id={roleErrorId} className="mt-1 text-[11px] text-danger">
              {errors.role}
            </p>
          )}
        </FormRow>

        <div className="grid grid-cols-2 gap-3">
          <FormRow label="Start time" required htmlFor="add-shift-start">
            <input
              id="add-shift-start"
              type="time"
              value={form.start}
              onChange={(e) => setForm((prev) => ({ ...prev, start: e.target.value }))}
              aria-invalid={submitted && Boolean(errors.timeOrder)}
              aria-describedby={submitted && errors.timeOrder ? timeErrorId : undefined}
              className="w-full h-9 rounded-lg border border-border bg-background px-2 text-sm"
            />
          </FormRow>
          <FormRow label="End time" required htmlFor="add-shift-end">
            <input
              id="add-shift-end"
              type="time"
              value={form.end}
              onChange={(e) => setForm((prev) => ({ ...prev, end: e.target.value }))}
              aria-invalid={submitted && Boolean(errors.timeOrder)}
              aria-describedby={submitted && errors.timeOrder ? timeErrorId : undefined}
              className="w-full h-9 rounded-lg border border-border bg-background px-2 text-sm"
            />
          </FormRow>
        </div>
        {submitted && errors.timeOrder && (
          <p id={timeErrorId} className="text-[11px] text-danger">
            {errors.timeOrder}
          </p>
        )}

        <FormRow
          label="Assign to"
          hint="Leave blank to post as an open shift."
          htmlFor="add-shift-assign"
        >
          <select
            id="add-shift-assign"
            value={form.assignTo}
            onChange={(e) => setForm((prev) => ({ ...prev, assignTo: e.target.value }))}
            className="w-full h-9 rounded-lg border border-border bg-background px-2 text-sm"
          >
            <option value="">Post as open shift</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} · {s.role}
              </option>
            ))}
          </select>
        </FormRow>
      </FormSection>
    </DrawerShell>
  );
}
