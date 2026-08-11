import { FormRow } from "@/components/dl";
import { MONTHS } from "../lib/staffBirthday";
import type { StaffBirthdayField } from "../hooks/useStaffBirthdayField";

/**
 * Optional day + month only. No year is collected or stored, so this can never
 * yield an age (ADR-0004). Clearing both fields removes the birthday.
 */
export function StaffBirthdayFields({ field }: { field: StaffBirthdayField }) {
  return (
    <FormRow
      label="Birthday (day & month)"
      hint="Optional. Used for manager reminders in Team. No year is stored."
      htmlFor="staff-birth-day"
    >
      <div className="flex gap-2">
        <input
          id="staff-birth-day"
          type="number"
          inputMode="numeric"
          min={1}
          max={31}
          placeholder="Day"
          aria-label="Birthday day"
          value={field.value.day}
          onChange={(event) => field.setDay(event.target.value)}
          className="h-9 w-24 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
        />
        <select
          aria-label="Birthday month"
          value={field.value.month}
          onChange={(event) => field.setMonth(event.target.value)}
          className="h-9 flex-1 rounded-lg border border-border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
        >
          <option value="">No month</option>
          {MONTHS.map((month) => (
            <option key={month.value} value={String(month.value)}>
              {month.label}
            </option>
          ))}
        </select>
      </div>
    </FormRow>
  );
}
