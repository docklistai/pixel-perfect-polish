import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, UserPlus } from "lucide-react";
import { ActionButton, DialogShell, FormRow, FormSection } from "@/components/dl";
import { createStaffMemberFn } from "../api/createStaffMember";
import {
  buildStaffMemberInsert,
  canSubmitAddStaffForm,
  describeStaffWriteError,
  STAFF_CONTRACT_OPTIONS,
  type AddStaffFieldError,
  type AddStaffFormValues,
} from "../lib/addStaff";
import type { WorkspaceDepartment } from "../types";

interface AddStaffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Live roster create is real; the demo seed cannot back a real write. */
  source: "live" | "demo";
  departments: WorkspaceDepartment[];
  departmentsLoading: boolean;
}

const EMPTY_VALUES: AddStaffFormValues = {
  fullName: "",
  email: "",
  role: "",
  departmentId: "",
  contractType: "",
  hoursPerWeek: "",
};

export function AddStaffDialog({
  open,
  onOpenChange,
  source,
  departments,
  departmentsLoading,
}: AddStaffDialogProps) {
  const queryClient = useQueryClient();
  const [values, setValues] = React.useState<AddStaffFormValues>(EMPTY_VALUES);
  const [fieldErrors, setFieldErrors] = React.useState<Partial<Record<AddStaffFieldError, string>>>(
    {},
  );
  const [formError, setFormError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  // Focus returns to whichever opener was used — the page header button or the
  // staff-table empty-state button — via the shared DialogShell behaviour.

  // Reset to a clean form whenever the dialog closes.
  React.useEffect(() => {
    if (!open) {
      setValues(EMPTY_VALUES);
      setFieldErrors({});
      setFormError(null);
      setSubmitting(false);
    }
  }, [open]);

  const isDemo = source === "demo";
  const canSubmit = canSubmitAddStaffForm({ source, submitting, departmentsLoading });

  function setField<K extends keyof AddStaffFormValues>(key: K, value: AddStaffFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;

    setFormError(null);
    const built = buildStaffMemberInsert(values);
    if (!built.ok) {
      setFieldErrors(built.errors);
      return;
    }
    setFieldErrors({});
    setSubmitting(true);
    try {
      const result = await createStaffMemberFn({ data: built.payload });
      if (!result.ok) {
        setFormError(result.message);
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["staff", "workspace-roster"] });
      toast.success(`${built.payload.display_name} added to your team`, {
        description: "They're ready to schedule on the rota.",
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
      title="Add staff member"
      description="Create a team member so they can be scheduled on the rota."
      icon={UserPlus}
      size="lg"
      footer={
        <>
          <ActionButton variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </ActionButton>
          <ActionButton size="sm" type="submit" form="add-staff-form" disabled={!canSubmit}>
            {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
            {submitting ? "Adding…" : "Add staff member"}
          </ActionButton>
        </>
      }
    >
      <form id="add-staff-form" onSubmit={handleSubmit} className="space-y-5">
        {isDemo && (
          <div className="rounded-xl border border-border/40 bg-[var(--bg-raised)] px-3 py-2 text-xs text-muted-foreground">
            This roster is demo data. Real staff can only be added to a live workspace.
          </div>
        )}

        {formError && (
          <div
            role="alert"
            className="rounded-xl border border-danger/30 bg-danger-soft px-3 py-2 text-xs text-danger"
          >
            {formError}
          </div>
        )}

        <FormSection title="Details">
          <FormRow label="Full name" htmlFor="add-staff-name" required>
            <input
              id="add-staff-name"
              className="dl-input"
              value={values.fullName}
              onChange={(e) => setField("fullName", e.target.value)}
              autoComplete="off"
              aria-invalid={Boolean(fieldErrors.fullName)}
              aria-describedby={fieldErrors.fullName ? "add-staff-name-error" : undefined}
            />
            {fieldErrors.fullName && (
              <p id="add-staff-name-error" className="text-[11px] text-danger">
                {fieldErrors.fullName}
              </p>
            )}
          </FormRow>

          <FormRow label="Email" htmlFor="add-staff-email" hint="Optional">
            <input
              id="add-staff-email"
              type="email"
              className="dl-input mono"
              value={values.email}
              onChange={(e) => setField("email", e.target.value)}
              autoComplete="off"
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={fieldErrors.email ? "add-staff-email-error" : undefined}
            />
            {fieldErrors.email && (
              <p id="add-staff-email-error" className="text-[11px] text-danger">
                {fieldErrors.email}
              </p>
            )}
          </FormRow>

          <FormRow label="Role" htmlFor="add-staff-role" required>
            <input
              id="add-staff-role"
              className="dl-input"
              value={values.role}
              onChange={(e) => setField("role", e.target.value)}
              autoComplete="off"
              placeholder="e.g. Waiter, Bartender, Head Chef"
              aria-invalid={Boolean(fieldErrors.role)}
              aria-describedby={fieldErrors.role ? "add-staff-role-error" : undefined}
            />
            {fieldErrors.role && (
              <p id="add-staff-role-error" className="text-[11px] text-danger">
                {fieldErrors.role}
              </p>
            )}
          </FormRow>
        </FormSection>

        <FormSection title="Scheduling">
          <FormRow label="Department" htmlFor="add-staff-department" hint="Optional">
            <select
              id="add-staff-department"
              className="dl-select"
              value={values.departmentId}
              onChange={(e) => setField("departmentId", e.target.value)}
              disabled={departmentsLoading}
            >
              <option value="">
                {departmentsLoading ? "Loading departments..." : "Unassigned"}
              </option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
            {departmentsLoading && (
              <p className="text-[11px] text-muted-foreground">
                Loading starter departments before staff can be created.
              </p>
            )}
          </FormRow>

          <FormRow label="Contract type" htmlFor="add-staff-contract" hint="Optional">
            <select
              id="add-staff-contract"
              className="dl-select"
              value={values.contractType}
              onChange={(e) => setField("contractType", e.target.value)}
            >
              <option value="">Not set</option>
              {STAFF_CONTRACT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </FormRow>

          <FormRow label="Contracted hours / week" htmlFor="add-staff-hours" hint="Optional">
            <input
              id="add-staff-hours"
              type="number"
              inputMode="decimal"
              min={0}
              max={168}
              step="0.5"
              className="dl-input mono"
              value={values.hoursPerWeek}
              onChange={(e) => setField("hoursPerWeek", e.target.value)}
              aria-invalid={Boolean(fieldErrors.hoursPerWeek)}
              aria-describedby={fieldErrors.hoursPerWeek ? "add-staff-hours-error" : undefined}
            />
            {fieldErrors.hoursPerWeek && (
              <p id="add-staff-hours-error" className="text-[11px] text-danger">
                {fieldErrors.hoursPerWeek}
              </p>
            )}
          </FormRow>
        </FormSection>
      </form>
    </DialogShell>
  );
}
