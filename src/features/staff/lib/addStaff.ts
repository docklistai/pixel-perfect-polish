import type { StaffContractType } from "../types";

/**
 * Pure helpers for the Add Staff slice. These translate raw form values into the
 * minimal `staff_members` insert payload and map database errors to honest,
 * non-leaking manager-facing copy. Kept free of React/Supabase so the rules are
 * unit-testable in the node test environment.
 */

/** Raw values collected by the Add Staff form (all strings, as typed). */
export interface AddStaffFormValues {
  fullName: string;
  email: string;
  role: string;
  /** Department uuid, or "" for Unassigned. */
  departmentId: string;
  /** Contract type value, or "" for none. */
  contractType: string;
  /** Contracted hours per week as typed, or "" for none. */
  hoursPerWeek: string;
}

/** Minimal insert payload — `workspace_id`/status are set server-side, never here. */
export interface StaffMemberInsert {
  display_name: string;
  email: string | null;
  role_name: string;
  department_id: string | null;
  contract_type: StaffContractType | null;
  contracted_minutes_per_week: number | null;
}

export type AddStaffFieldError = "fullName" | "email" | "role" | "hoursPerWeek";

export type BuildStaffInsertResult =
  | { ok: true; payload: StaffMemberInsert }
  | { ok: false; errors: Partial<Record<AddStaffFieldError, string>> };

/** Selectable contract options, paired with their human labels. */
export const STAFF_CONTRACT_OPTIONS: ReadonlyArray<{ value: StaffContractType; label: string }> = [
  { value: "full_time", label: "Full-time" },
  { value: "part_time", label: "Part-time" },
  { value: "casual", label: "Casual" },
  { value: "fixed_term", label: "Fixed-term" },
];

const CONTRACT_VALUES = new Set<string>(STAFF_CONTRACT_OPTIONS.map((o) => o.value));

// Schema bounds mirror public.staff_members CHECK constraints so the form never
// posts a payload the database will reject.
const DISPLAY_NAME_MAX = 160;
const ROLE_NAME_MAX = 120;
const MAX_MINUTES_PER_WEEK = 10080; // 168h
const MAX_HOURS_PER_WEEK = MAX_MINUTES_PER_WEEK / 60;

// Deliberately permissive: just enough to catch obvious typos before the DB
// rejects on its own constraints. The database remains the authority.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isContractType(value: string): value is StaffContractType {
  return CONTRACT_VALUES.has(value);
}

/**
 * Validates and normalises form values into a `staff_members` insert payload.
 * Trims text, lowercases email, and converts contracted hours to whole minutes.
 * Optional fields collapse to `null`. Returns field-keyed errors on failure.
 */
export function buildStaffMemberInsert(values: AddStaffFormValues): BuildStaffInsertResult {
  const errors: Partial<Record<AddStaffFieldError, string>> = {};

  const display_name = values.fullName.trim();
  if (!display_name) {
    errors.fullName = "Enter the staff member's name.";
  } else if (display_name.length > DISPLAY_NAME_MAX) {
    errors.fullName = `Name must be ${DISPLAY_NAME_MAX} characters or fewer.`;
  }

  const role_name = values.role.trim();
  if (!role_name) {
    errors.role = "Enter a role so they can be scheduled.";
  } else if (role_name.length > ROLE_NAME_MAX) {
    errors.role = `Role must be ${ROLE_NAME_MAX} characters or fewer.`;
  }

  const trimmedEmail = values.email.trim().toLowerCase();
  let email: string | null = null;
  if (trimmedEmail) {
    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      errors.email = "Enter a valid email address, or leave it blank.";
    } else {
      email = trimmedEmail;
    }
  }

  let contracted_minutes_per_week: number | null = null;
  const trimmedHours = values.hoursPerWeek.trim();
  if (trimmedHours) {
    const hours = Number(trimmedHours);
    if (!Number.isFinite(hours) || hours < 0) {
      errors.hoursPerWeek = "Enter contracted hours as a positive number, or leave it blank.";
    } else if (hours > MAX_HOURS_PER_WEEK) {
      errors.hoursPerWeek = `Hours can't exceed ${MAX_HOURS_PER_WEEK} per week.`;
    } else {
      contracted_minutes_per_week = Math.round(hours * 60);
    }
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  const department_id = values.departmentId.trim() || null;
  const contractValue = values.contractType.trim();
  const contract_type = isContractType(contractValue) ? contractValue : null;

  return {
    ok: true,
    payload: {
      display_name,
      email,
      role_name,
      department_id,
      contract_type,
      contracted_minutes_per_week,
    },
  };
}

/**
 * Maps a Postgres error code raised while inserting a staff member to an honest,
 * non-leaking manager-facing message. The database is the authority for what is
 * allowed; this only translates the failure.
 */
export function describeStaffWriteError(sqlState: string | null): string {
  switch (sqlState) {
    case "23505": // unique_violation — workspace email uniqueness
      return "A staff member with this email already exists in your workspace.";
    case "23503": // foreign_key_violation — department no longer exists
      return "That department is no longer available. Pick another, or leave it unassigned.";
    case "23514": // check_violation — contract/hours bounds
      return "Some details aren't valid. Check the contracted hours and try again.";
    case "42501": // insufficient_privilege — RLS denied
      return "You don't have permission to add staff to this workspace.";
    case "PGRST116": // no row returned — update target not in this workspace
      return "That staff member could not be found in this workspace.";
    default:
      return "We couldn't save this staff member. Please try again.";
  }
}
