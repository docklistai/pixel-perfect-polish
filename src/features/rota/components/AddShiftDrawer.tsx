import * as React from "react";
import { Check, Plus } from "lucide-react";
import { DialogShell, ActionButton } from "@/components/dl";
import { isValidShiftTimeRange } from "../lib/draftRota";
import type { DraftShiftInput, RotaDayIndex, StaffMember } from "../types";
import type { MaybePromise } from "./grid";
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
  onSubmit: (input: DraftShiftInput) => MaybePromise<void>;
}) {
  const initialForm = React.useMemo<AddShiftFormState>(
    () => ({ ...DEFAULT_FORM, role: roles[0] ?? "" }),
    [roles],
  );
  const [form, setForm] = React.useState<AddShiftFormState>(initialForm);
  const [submitted, setSubmitted] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const wasOpenRef = React.useRef(open);

  React.useEffect(() => {
    if (open && !wasOpenRef.current) {
      setForm(initialForm);
      setSubmitted(false);
      setSaving(false);
      setSaveError(null);
    }
    wasOpenRef.current = open;
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
  const handleSave = async (keepOpen: boolean) => {
    setSubmitted(true);
    setSaveError(null);
    if (hasError) return;
    setSaving(true);
    const finalDayIndex = form.repeat ? 6 : form.dayIndex;
    try {
      for (let dayIndex = form.dayIndex; dayIndex <= finalDayIndex; dayIndex += 1) {
        await onSubmit({
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
    } catch (error) {
      // The live persistence hook also raises a toast, but the drawer stays open
      // with the entered fields so the manager can read the reason and retry.
      setSaveError(
        error instanceof Error && error.message
          ? error.message
          : "We couldn't save this shift. Please try again.",
      );
    } finally {
      setSaving(false);
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
          <ActionButton variant="ghost" disabled={saving} onClick={() => onOpenChange(false)}>
            Cancel
          </ActionButton>
          <ActionButton variant="secondary" disabled={saving} onClick={() => void handleSave(true)}>
            Save &amp; add another
          </ActionButton>
          <ActionButton icon={Check} disabled={saving} onClick={() => void handleSave(false)}>
            Save shift
          </ActionButton>
        </>
      }
    >
      {saveError && (
        <div
          role="alert"
          className="mb-4 rounded-xl border border-danger/30 bg-danger-soft px-3 py-2 text-xs text-danger"
        >
          {saveError}
        </div>
      )}
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
