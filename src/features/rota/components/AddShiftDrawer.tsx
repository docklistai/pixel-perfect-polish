import * as React from "react";
import { Check, Plus } from "lucide-react";
import { DialogShell, ActionButton } from "@/components/dl";
import { isValidShiftTimeRange } from "../lib/draftRota";
import type { DraftShiftInput, RotaDayIndex, StaffMember } from "../types";
import { AddShiftFormFields, type AddShiftFormState } from "./AddShiftFormFields";

type DayEntry = { d: string };

const DEFAULT_FORM: AddShiftFormState = {
  dayIndex: 0,
  role: "",
  start: "17:00",
  end: "23:00",
  assignTo: "",
  breakMinutes: 30,
  repeat: false,
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
  const initialForm = React.useMemo<AddShiftFormState>(
    () => ({ ...DEFAULT_FORM, role: roles[0] ?? "" }),
    [roles],
  );
  const [form, setForm] = React.useState<AddShiftFormState>(initialForm);
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
  const handleSave = (keepOpen: boolean) => {
    setSubmitted(true);
    if (hasError) return;
    const finalDayIndex = form.repeat ? 6 : form.dayIndex;
    for (let dayIndex = form.dayIndex; dayIndex <= finalDayIndex; dayIndex += 1) {
      onSubmit({
        dayIndex: dayIndex as RotaDayIndex,
        staffId: form.assignTo === "" ? null : form.assignTo,
        role: form.role,
        start: form.start,
        end: form.end,
        breakMinutes: form.breakMinutes,
      });
    }
    if (keepOpen) {
      setForm((current) => ({ ...initialForm, dayIndex: current.dayIndex }));
      setSubmitted(false);
    } else {
      onOpenChange(false);
    }
  };

  return (
    <DialogShell
      open={open}
      onOpenChange={onOpenChange}
      title="Add a shift"
      description="Choose staff, day and time"
      icon={Plus}
      size="lg"
      footer={
        <>
          <ActionButton variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </ActionButton>
          <ActionButton variant="secondary" onClick={() => handleSave(true)}>
            Save &amp; add another
          </ActionButton>
          <ActionButton icon={Check} onClick={() => handleSave(false)}>
            Save shift
          </ActionButton>
        </>
      }
    >
      <AddShiftFormFields
        form={form}
        setForm={setForm}
        days={days}
        staff={staff}
        roles={roles}
        submitted={submitted}
        roleError={errors.role}
        timeError={errors.timeOrder}
      />
    </DialogShell>
  );
}
