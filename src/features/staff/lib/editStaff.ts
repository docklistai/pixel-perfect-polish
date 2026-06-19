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

/** Edit form values: the Add fields plus phone and employment status. */
export interface EditStaffFormValues extends AddStaffFormValues {
  phone: string;
  employmentStatus: StaffEmploymentStatus;
}

/** Update payload — `id`/`workspace_id` are applied server-side, never here. */
export interface StaffMemberUpdate extends StaffMemberInsert {
  phone: string | null;
  employment_status: StaffEmploymentStatus;
}

export type BuildStaffUpdateResult =
  | { ok: true; payload: StaffMemberUpdate }
  | { ok: false; errors: Partial<Record<keyof AddStaffFormValues, string>> };

/** Selectable employment statuses, paired with their human labels. */
export const STAFF_EMPLOYMENT_STATUS_OPTIONS: ReadonlyArray<{
  value: StaffEmploymentStatus;
  label: string;
}> = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "left", label: "Left" },
];

const EMPLOYMENT_STATUS_VALUES = new Set<string>(
  STAFF_EMPLOYMENT_STATUS_OPTIONS.map((o) => o.value),
);

export function isEmploymentStatus(value: string): value is StaffEmploymentStatus {
  return EMPLOYMENT_STATUS_VALUES.has(value);
}

/**
 * Validates and normalises edit form values into a `staff_members` update
 * payload. Delegates the shared fields to {@link buildStaffMemberInsert} (same
 * trim/lowercase/hours→minutes/null rules and field errors), then adds the
 * trimmed-or-null phone and the validated employment status.
 */
export function buildStaffMemberUpdate(values: EditStaffFormValues): BuildStaffUpdateResult {
  const base = buildStaffMemberInsert(values);
  if (!base.ok) return base;

  const phone = values.phone.trim() || null;
  const employment_status: StaffEmploymentStatus = isEmploymentStatus(values.employmentStatus)
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
  employment_status: z.enum(["active", "inactive", "left"]),
});

export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;
