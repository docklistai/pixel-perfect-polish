import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Pencil } from "lucide-react";
import { ActionButton, DialogShell, FormRow, FormSection } from "@/components/dl";
import { updateStaffMemberFn } from "../api/updateStaffMember";
import { buildStaffMemberUpdate, type EditStaffFormValues } from "../lib/editStaff";
import { submitEditStaff } from "../lib/editStaffSubmission";
import { useWorkspaceDepartments } from "../hooks/useWorkspaceDepartments";
import { useStaffPayRateField } from "../hooks/useStaffPayRateField";
import { useStaffBirthdayField } from "../hooks/useStaffBirthdayField";
import { StaffBirthdayFields } from "./StaffBirthdayFields";
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
    // An offboarded member has no editable status; the field is locked and the
    // stored 'left' is never carried into the form or written back.
    employmentStatus: member.employmentStatus === "inactive" ? "inactive" : "active",
  };
}

export function EditStaffDialog({ open, onOpenChange, member }: EditStaffDialogProps) {
  const queryClient = useQueryClient();
  const { departments } = useWorkspaceDepartments({ enabled: open });
  const payRate = useStaffPayRateField(member.id, open);
  const birthday = useStaffBirthdayField(member, open);
  const [values, setValues] = React.useState<EditStaffFormValues>(() => valuesFromMember(member));
  const [fieldErrors, setFieldErrors] = React.useState<Partial<Record<FieldError, string>>>({});
  const [detailsError, setDetailsError] = React.useState<string | null>(null);
  const [payError, setPayError] = React.useState<string | null>(null);
  const [birthdayError, setBirthdayError] = React.useState<string | null>(null);
  // Sticky across retries: once the details have persisted, a retry for the pay
  // rate must not re-send them, and must not re-describe them as unsaved.
  const [detailsSaved, setDetailsSaved] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const offboarded = member.employmentStatus === "left";

  // Re-prefill whenever the dialog opens or the target member changes; clear
  // transient state when it closes.
  React.useEffect(() => {
    if (open) {
      setValues(valuesFromMember(member));
      setFieldErrors({});
      setDetailsError(null);
      setPayError(null);
      setBirthdayError(null);
      setDetailsSaved(false);
      setSubmitting(false);
    }
  }, [open, member]);

  function setField<K extends keyof EditStaffFormValues>(key: K, value: EditStaffFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;

    setDetailsError(null);
    setPayError(null);
    setBirthdayError(null);
    const built = buildStaffMemberUpdate(values, { offboarded });
    if (!built.ok) {
      setFieldErrors(built.errors);
      return;
    }
    setFieldErrors({});
    setSubmitting(true);

    const outcome = await submitEditStaff({
      detailsAlreadySaved: detailsSaved,
      saveDetails: () => updateStaffMemberFn({ data: { id: member.id, ...built.payload } }),
      savePayRate: payRate.submit,
    });
    setSubmitting(false);
    setDetailsError(outcome.detailsError);
    setPayError(outcome.payError);

    if (outcome.details === "failed") return;
    if (outcome.details === "saved") setDetailsSaved(true);

    // A third independent write, like the pay rate: it goes to its own
    // audited RPC and reports only itself, so a birthday problem never
    // re-describes saved details as failed.
    const birthdayResult = await birthday.submit();
    if (!birthdayResult.ok) setBirthdayError(birthdayResult.message);

    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["staff", "workspace-roster"] }),
      // Team reads birthdays from the same rows; keep its rail in step.
      queryClient.invalidateQueries({ queryKey: ["team"] }),
    ]);

    // The details are on record either way. A pay-rate failure reports only
    // itself, and leaves the dialog open so the rate alone can be retried.
    if (outcome.pay === "failed") {
      toast.warning(`${built.payload.display_name} updated`, {
        description: "Their details saved. The hourly rate did not.",
      });
      return;
    }
    if (!birthdayResult.ok) {
      toast.warning(`${built.payload.display_name} updated`, {
        description: "Their details saved. The birthday did not.",
      });
      return;
    }
    toast.success(`${built.payload.display_name} updated`, {
      description: "Their scheduling details are up to date.",
    });
    onOpenChange(false);
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
        {detailsError && (
          <div
            role="alert"
            className="rounded-xl border border-danger/30 bg-danger-soft px-3 py-2 text-xs text-danger"
          >
            {detailsError}
          </div>
        )}

        {detailsSaved && payError && (
          <div
            role="status"
            className="rounded-xl border border-success/30 bg-success-soft px-3 py-2 text-xs text-success"
          >
            Their details are saved. Only the hourly rate below still needs attention.
          </div>
        )}

        {payError && (
          <div
            role="alert"
            className="rounded-xl border border-danger/30 bg-danger-soft px-3 py-2 text-xs text-danger"
          >
            Hourly rate not saved. {payError}
          </div>
        )}

        {birthdayError && (
          <div
            role="alert"
            className="rounded-xl border border-danger/30 bg-danger-soft px-3 py-2 text-xs text-danger"
          >
            Birthday not saved. {birthdayError}
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

          <StaffBirthdayFields field={birthday} />
        </FormSection>

        <EditStaffSchedulingFields
          values={values}
          fieldErrors={fieldErrors}
          setField={setField}
          departments={departments}
          payRate={payRate}
          offboarded={offboarded}
        />
      </form>
    </DialogShell>
  );
}
