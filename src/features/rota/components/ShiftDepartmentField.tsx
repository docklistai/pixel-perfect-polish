import { FormRow } from "@/components/dl";
import type { WorkspaceDepartment } from "../api/workspaceDepartments";

/**
 * Department picker for a single shift.
 *
 * The shift's department is authoritative; the staff member's profile
 * department is only the starting suggestion. Choosing a different one is a
 * normal, allowed action — it is surfaced calmly, never as an error, and it
 * never edits the staff member's own department.
 */

export function ShiftDepartmentField({
  id,
  value,
  departments,
  isEmpty,
  warning,
  onChange,
}: {
  id: string;
  value: string;
  departments: WorkspaceDepartment[];
  isEmpty: boolean;
  warning: string | null;
  onChange: (departmentId: string) => void;
}) {
  const warningId = `${id}-warning`;

  if (isEmpty) {
    return (
      <FormRow label="Department" htmlFor={id}>
        <p className="text-[11px] text-muted-foreground">
          No active departments yet. Add one in Settings — this shift will use the workspace
          default.
        </p>
      </FormRow>
    );
  }

  return (
    <FormRow label="Department" htmlFor={id}>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-describedby={warning ? warningId : undefined}
        className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm"
      >
        <option value="">Use the default for this shift</option>
        {departments.map((department) => (
          <option key={department.id} value={department.id}>
            {department.name}
          </option>
        ))}
      </select>
      {warning && (
        <p id={warningId} className="mt-1 text-[11px] text-muted-foreground">
          {warning}
        </p>
      )}
    </FormRow>
  );
}
