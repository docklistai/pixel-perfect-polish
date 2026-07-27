import { z } from "zod";
import {
  buildStaffMemberInsert,
  type AddStaffFormValues,
  type StaffMemberInsert,
} from "./addStaff";
import type { StaffEmploymentStatus } from "../types";

/**
 * Pure helpers for the Edit Staff slice. Reuses the Add Staff normalisation for
 * the shared fields and layers on the two edit-only fields (phone, employment
 * status). The update input schema lives here too so it can be validated in the
 * node test environment without importing the server function.
 */

/** The statuses a generic staff edit may set. `left` belongs to Offboard only. */
export type EditableStaffEmploymentStatus = Exclude<StaffEmploymentStatus, "left">;

/** Edit form values: the Add fields plus phone and employment status. */
export interface EditStaffFormValues extends AddStaffFormValues {
  phone: string;
  employmentStatus: EditableStaffEmploymentStatus;
}

/** Update payload — `id`/`workspace_id` are applied server-side, never here. */
export interface StaffMemberUpdate extends StaffMemberInsert {
  phone: string | null;
  /**
   * Omitted for an already-offboarded member. Removing `left` from the editable
   * statuses would otherwise make every generic edit of an offboarded person
   * silently reinstate them; leaving the column out keeps their state intact.
   */
  employment_status?: EditableStaffEmploymentStatus;
}

export const OFFBOARD_ONLY_STATUS_MESSAGE =
  "Marking someone as left is only possible through Offboard, which also revokes their portal access.";

/** True when a payload asks a generic staff update to write `left`. */
export function isOffboardOnlyStatusWrite(input: unknown): boolean {
  return (
    typeof input === "object" &&
    input !== null &&
    (input as { employment_status?: unknown }).employment_status === "left"
  );
}

export type BuildStaffUpdateResult =
  | { ok: true; payload: StaffMemberUpdate }
  | { ok: false; errors: Partial<Record<keyof AddStaffFormValues, string>> };

/**
 * Selectable employment statuses, paired with their human labels.
 *
 * `left` is deliberately absent. Offboarding revokes portal access, cancels
 * outstanding codes and writes an end date and an audit event, none of which a
 * generic field edit performs — so a manager who picked "Left" here produced a
 * staff member who looked offboarded but still held live access. The phase 41
 * Offboard action (`rpc_offboard_staff_member`) is the only supported route to
 * `left`, and {@link updateStaffSchema} rejects it outright.
 */
export const STAFF_EMPLOYMENT_STATUS_OPTIONS: ReadonlyArray<{
  value: EditableStaffEmploymentStatus;
  label: string;
}> = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const EMPLOYMENT_STATUS_VALUES = new Set<string>(
  STAFF_EMPLOYMENT_STATUS_OPTIONS.map((o) => o.value),
);

export function isEmploymentStatus(value: string): value is EditableStaffEmploymentStatus {
  return EMPLOYMENT_STATUS_VALUES.has(value);
}

/**
 * Validates and normalises edit form values into a `staff_members` update
 * payload. Delegates the shared fields to {@link buildStaffMemberInsert} (same
 * trim/lowercase/hours→minutes/null rules and field errors), then adds the
 * trimmed-or-null phone and the validated employment status.
 */
export function buildStaffMemberUpdate(
  values: EditStaffFormValues,
  options: { offboarded?: boolean } = {},
): BuildStaffUpdateResult {
  const base = buildStaffMemberInsert(values);
  if (!base.ok) return base;

  const phone = values.phone.trim() || null;
  // An offboarded member keeps their status: the edit carries their scheduling
  // details only, and reinstating them stays a deliberate, separate act.
  if (options.offboarded) return { ok: true, payload: { ...base.payload, phone } };

  const employment_status: EditableStaffEmploymentStatus = isEmploymentStatus(
    values.employmentStatus,
  )
    ? values.employmentStatus
    : "active";

  return { ok: true, payload: { ...base.payload, phone, employment_status } };
}

/**
 * Server-side validation schema for the update server function. `id` identifies
 * the row; `workspace_id` is deliberately absent so a client can never target a
 * row outside its resolved workspace — zod strips any extra keys.
 */
export const updateStaffSchema = z.object({
  id: z.string().uuid(),
  display_name: z.string().min(1).max(160),
  email: z.string().email().max(320).nullable(),
  phone: z.string().max(40).nullable(),
  role_name: z.string().min(1).max(120),
  department_id: z.string().uuid().nullable(),
  contract_type: z.enum(["full_time", "part_time", "casual", "fixed_term"]).nullable(),
  contracted_minutes_per_week: z.number().int().min(0).max(10080).nullable(),
  // 'left' is not accepted here. Offboarding is a distinct action with its own
  // access revocation and audit trail, so a generic update that asks for it is
  // rejected by validation before it reaches the database. Absent means "leave
  // the stored status alone", which is how an offboarded member is edited.
  employment_status: z.enum(["active", "inactive"]).optional(),
});

export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;
