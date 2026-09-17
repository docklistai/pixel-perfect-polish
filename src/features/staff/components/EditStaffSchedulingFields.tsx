import * as React from "react";
import { Plus, X } from "lucide-react";
import { FormRow, FormSection } from "@/components/dl";
import { normaliseRoleKey } from "@/features/rota/lib/scheduling/shiftSignature";
import { STAFF_CONTRACT_OPTIONS } from "../lib/addStaff";
import { STAFF_EMPLOYMENT_STATUS_OPTIONS, type EditStaffFormValues } from "../lib/editStaff";
import type { StaffPayRateField } from "../hooks/useStaffPayRateField";
import type { AddStaffFormValues } from "../lib/addStaff";

type FieldError = keyof AddStaffFormValues;

/** Scheduling + pay section of the edit-staff dialog. */
export function EditStaffSchedulingFields({
  values,
  fieldErrors,
  setField,
  departments,
  payRate,
  offboarded = false,
}: {
  values: EditStaffFormValues;
  fieldErrors: Partial<Record<FieldError, string>>;
  setField: <K extends keyof EditStaffFormValues>(key: K, value: EditStaffFormValues[K]) => void;
  departments: { id: string; name: string }[];
  payRate: StaffPayRateField;
  /** True for a member already offboarded; their status is not editable here. */
  offboarded?: boolean;
}) {
  const [newRoleInput, setNewRoleInput] = React.useState("");
  const [roleError, setRoleError] = React.useState<string | null>(null);

  function handleAddRole() {
    const trimmed = newRoleInput.trim();
    if (!trimmed) return;
    const key = normaliseRoleKey(trimmed);
    if (normaliseRoleKey(values.role) === key) {
      setRoleError("Primary role is already eligible.");
      return;
    }
    if ((values.eligibleRoles ?? []).some((r) => normaliseRoleKey(r) === key)) {
      setRoleError("Role is already added.");
      return;
    }
    setRoleError(null);
    setField("eligibleRoles", [...(values.eligibleRoles ?? []), trimmed]);
    setNewRoleInput("");
  }

  function handleRemoveRole(index: number) {
    setField(
      "eligibleRoles",
      (values.eligibleRoles ?? []).filter((_, i) => i !== index),
    );
  }
  return (
    <FormSection title="Scheduling">
      <FormRow label="Department" htmlFor="edit-staff-department" hint="Optional">
        <select
          id="edit-staff-department"
          className="dl-select"
          value={values.departmentId}
          onChange={(e) => setField("departmentId", e.target.value)}
        >
          <option value="">Unassigned</option>
          {departments.map((dept) => (
            <option key={dept.id} value={dept.id}>
              {dept.name}
            </option>
          ))}
        </select>
      </FormRow>

      {offboarded ? (
        <FormRow label="Status">
          <p className="text-xs text-muted-foreground">
            Left — offboarded. Saving here updates their details only and leaves that unchanged.
          </p>
        </FormRow>
      ) : (
        <FormRow
          label="Status"
          htmlFor="edit-staff-status"
          hint="Use Offboard to mark someone as left"
        >
          <select
            id="edit-staff-status"
            className="dl-select"
            value={values.employmentStatus}
            onChange={(e) =>
              setField(
                "employmentStatus",
                e.target.value as EditStaffFormValues["employmentStatus"],
              )
            }
          >
            {STAFF_EMPLOYMENT_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </FormRow>
      )}

      <FormRow label="Contract type" htmlFor="edit-staff-contract" hint="Optional">
        <select
          id="edit-staff-contract"
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

      <FormRow label="Contracted hours / week" htmlFor="edit-staff-hours" hint="Optional">
        <input
          id="edit-staff-hours"
          type="number"
          inputMode="decimal"
          min={0}
          max={168}
          step="0.5"
          className="dl-input mono"
          value={values.hoursPerWeek}
          onChange={(e) => setField("hoursPerWeek", e.target.value)}
          aria-invalid={Boolean(fieldErrors.hoursPerWeek)}
          aria-describedby={fieldErrors.hoursPerWeek ? "edit-staff-hours-error" : undefined}
        />
        {fieldErrors.hoursPerWeek && (
          <p id="edit-staff-hours-error" className="text-[11px] text-danger">
            {fieldErrors.hoursPerWeek}
          </p>
        )}
      </FormRow>

      <FormRow
        label="Secondary eligible roles"
        htmlFor="edit-staff-new-eligible-role"
        hint="Optional — additive roles for scheduling and open shifts"
      >
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              id="edit-staff-new-eligible-role"
              className="dl-input flex-1"
              placeholder="e.g. Barista, Cashier"
              value={newRoleInput}
              onChange={(e) => {
                setNewRoleInput(e.target.value);
                if (roleError) setRoleError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddRole();
                }
              }}
              autoComplete="off"
            />
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
              onClick={handleAddRole}
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
              <span>Add</span>
            </button>
          </div>
          {roleError && <p className="text-[11px] text-danger">{roleError}</p>}
          {values.eligibleRoles && values.eligibleRoles.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {values.eligibleRoles.map((role, idx) => (
                <span
                  key={`${role}-${idx}`}
                  className="inline-flex items-center gap-1 rounded-md bg-secondary/80 px-2 py-0.5 text-xs font-medium text-secondary-foreground"
                >
                  <span>{role}</span>
                  <button
                    type="button"
                    className="rounded p-0.5 text-muted-foreground hover:text-foreground focus:outline-none"
                    onClick={() => handleRemoveRole(idx)}
                    aria-label={`Remove eligible role ${role}`}
                  >
                    <X className="h-3 w-3" aria-hidden />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-muted-foreground">
              No secondary roles configured. Only primary role ({values.role || "not set"}) is
              eligible.
            </p>
          )}
        </div>
      </FormRow>

      {payRate.enabled && (
        <FormRow
          label="Hourly rate (£)"
          htmlFor="edit-staff-pay-rate"
          hint="Optional — used only for manager-side rota labour planning"
        >
          <input
            id="edit-staff-pay-rate"
            inputMode="decimal"
            className="dl-input mono"
            value={payRate.value}
            onChange={(e) => payRate.onChange(e.target.value)}
            placeholder="e.g. 13.20"
            autoComplete="off"
          />
        </FormRow>
      )}
    </FormSection>
  );
}
