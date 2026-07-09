import { FormRow, FormSection } from "@/components/dl";
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
}: {
  values: EditStaffFormValues;
  fieldErrors: Partial<Record<FieldError, string>>;
  setField: <K extends keyof EditStaffFormValues>(key: K, value: EditStaffFormValues[K]) => void;
  departments: { id: string; name: string }[];
  payRate: StaffPayRateField;
}) {
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

      <FormRow label="Status" htmlFor="edit-staff-status">
        <select
          id="edit-staff-status"
          className="dl-select"
          value={values.employmentStatus}
          onChange={(e) =>
            setField("employmentStatus", e.target.value as EditStaffFormValues["employmentStatus"])
          }
        >
          {STAFF_EMPLOYMENT_STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </FormRow>

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

      {payRate.enabled && (
        <FormRow
          label="Hourly rate (£)"
          htmlFor="edit-staff-pay-rate"
          hint="Optional — drives rota cost estimates and this person's portal pay estimate"
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
