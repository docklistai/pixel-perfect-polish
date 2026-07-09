import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Pencil } from "lucide-react";
import { ActionButton, DialogShell, FormRow, FormSection } from "@/components/dl";
import { updateStaffMemberFn } from "../api/updateStaffMember";
import { describeStaffWriteError } from "../lib/addStaff";
import { buildStaffMemberUpdate, type EditStaffFormValues } from "../lib/editStaff";
import { useWorkspaceDepartments } from "../hooks/useWorkspaceDepartments";
import { useStaffPayRateField } from "../hooks/useStaffPayRateField";
import { EditStaffSchedulingFields } from "./EditStaffSchedulingFields";
import type { AddStaffFormValues } from "../lib/addStaff";
import type { StaffRow } from "../types";

interface EditStaffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The live staff member to edit. */
  member: StaffRow;
}

type FieldError = keyof AddStaffFormValues;

/** Maps a live roster row to prefilled edit-form values. */
function valuesFromMember(member: StaffRow): EditStaffFormValues {
  const minutes = member.contractedMinutesPerWeek;
  return {
    fullName: member.name || member.n,
    email: member.e ?? "",
    phone: member.phone ?? "",
    role: member.role,
    departmentId: member.departmentId ?? "",
    contractType: member.contractType ?? "",
    hoursPerWeek: minutes != null ? String(minutes / 60) : "",
    employmentStatus: member.employmentStatus ?? "active",
  };
}

export function EditStaffDialog({ open, onOpenChange, member }: EditStaffDialogProps) {
  const queryClient = useQueryClient();
  const { departments } = useWorkspaceDepartments({ enabled: open });
  const payRate = useStaffPayRateField(member.id, open);
  const [values, setValues] = React.useState<EditStaffFormValues>(() => valuesFromMember(member));
  const [fieldErrors, setFieldErrors] = React.useState<Partial<Record<FieldError, string>>>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  // Re-prefill whenever the dialog opens or the target member changes; clear
  // transient state when it closes.
  React.useEffect(() => {
    if (open) {
      setValues(valuesFromMember(member));
      setFieldErrors({});
      setFormError(null);
      setSubmitting(false);
    }
  }, [open, member]);

  function setField<K extends keyof EditStaffFormValues>(key: K, value: EditStaffFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;

    setFormError(null);
    const built = buildStaffMemberUpdate(values);
    if (!built.ok) {
      setFieldErrors(built.errors);
      return;
    }
    setFieldErrors({});
    setSubmitting(true);
    try {
      const result = await updateStaffMemberFn({ data: { id: member.id, ...built.payload } });
      if (!result.ok) {
        setFormError(result.message);
        return;
      }
      const rateResult = await payRate.submit();
      if (!rateResult.ok) {
        setFormError(rateResult.message);
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["staff", "workspace-roster"] });
      toast.success(`${built.payload.display_name} updated`, {
        description: "Their scheduling details are up to date.",
      });
      onOpenChange(false);
    } catch {
      setFormError(describeStaffWriteError(null));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DialogShell
      open={open}
      onOpenChange={onOpenChange}
      title={`Edit ${member.n}`}
      description="Update the details used to schedule this team member."
      icon={Pencil}
      size="lg"
      footer={
        <>
          <ActionButton variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </ActionButton>
          <ActionButton size="sm" type="submit" form="edit-staff-form" disabled={submitting}>
            {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
            {submitting ? "Saving…" : "Save changes"}
          </ActionButton>
        </>
      }
    >
      <form id="edit-staff-form" onSubmit={handleSubmit} className="space-y-5">
        {formError && (
          <div
            role="alert"
            className="rounded-xl border border-danger/30 bg-danger-soft px-3 py-2 text-xs text-danger"
          >
            {formError}
          </div>
        )}

        <FormSection title="Details">
          <FormRow label="Full name" htmlFor="edit-staff-name" required>
            <input
              id="edit-staff-name"
              className="dl-input"
              value={values.fullName}
              onChange={(e) => setField("fullName", e.target.value)}
              autoComplete="off"
              aria-invalid={Boolean(fieldErrors.fullName)}
              aria-describedby={fieldErrors.fullName ? "edit-staff-name-error" : undefined}
            />
            {fieldErrors.fullName && (
              <p id="edit-staff-name-error" className="text-[11px] text-danger">
                {fieldErrors.fullName}
              </p>
            )}
          </FormRow>

          <FormRow label="Email" htmlFor="edit-staff-email" hint="Optional">
            <input
              id="edit-staff-email"
              type="email"
              className="dl-input mono"
              value={values.email}
              onChange={(e) => setField("email", e.target.value)}
              autoComplete="off"
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={fieldErrors.email ? "edit-staff-email-error" : undefined}
            />
            {fieldErrors.email && (
              <p id="edit-staff-email-error" className="text-[11px] text-danger">
                {fieldErrors.email}
              </p>
            )}
          </FormRow>

          <FormRow label="Phone" htmlFor="edit-staff-phone" hint="Optional">
            <input
              id="edit-staff-phone"
              type="tel"
              className="dl-input mono"
              value={values.phone}
              onChange={(e) => setField("phone", e.target.value)}
              autoComplete="off"
            />
          </FormRow>

          <FormRow label="Role" htmlFor="edit-staff-role" required>
            <input
              id="edit-staff-role"
              className="dl-input"
              value={values.role}
              onChange={(e) => setField("role", e.target.value)}
              autoComplete="off"
              aria-invalid={Boolean(fieldErrors.role)}
              aria-describedby={fieldErrors.role ? "edit-staff-role-error" : undefined}
            />
            {fieldErrors.role && (
              <p id="edit-staff-role-error" className="text-[11px] text-danger">
                {fieldErrors.role}
              </p>
            )}
          </FormRow>
        </FormSection>

        <EditStaffSchedulingFields
          values={values}
          fieldErrors={fieldErrors}
          setField={setField}
          departments={departments}
          payRate={payRate}
        />
      </form>
    </DialogShell>
  );
}
