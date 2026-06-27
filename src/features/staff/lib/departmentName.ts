/**
 * Pure validation for the minimal department manager. Mirrors the
 * `public.departments` constraints (name length 1–120, unique per workspace,
 * case-insensitive) so the UI never posts a name the database will reject.
 * No React/Supabase — unit-testable in the node test environment.
 */

export const DEPARTMENT_NAME_MAX = 120;

export interface DepartmentNameOption {
  id: string;
  name: string;
}

export type DepartmentNameResult = { ok: true; name: string } | { ok: false; message: string };

/**
 * Validates and normalises a department name. `existing` is the current set of
 * departments (active or archived); a duplicate name — ignoring case and the
 * row being renamed (`excludeId`) — is rejected to match the unique constraint.
 */
export function validateDepartmentName(
  raw: string,
  existing: DepartmentNameOption[],
  excludeId?: string,
): DepartmentNameResult {
  const name = raw.trim();
  if (!name) {
    return { ok: false, message: "Enter a department name." };
  }
  if (name.length > DEPARTMENT_NAME_MAX) {
    return { ok: false, message: `Name must be ${DEPARTMENT_NAME_MAX} characters or fewer.` };
  }
  const clash = existing.some(
    (dept) => dept.id !== excludeId && dept.name.trim().toLowerCase() === name.toLowerCase(),
  );
  if (clash) {
    return { ok: false, message: "A department with this name already exists." };
  }
  return { ok: true, name };
}

/**
 * Maps a Postgres error code raised while writing a department to honest,
 * non-leaking manager-facing copy. The database stays the authority.
 */
export function describeDepartmentWriteError(sqlState: string | null): string {
  switch (sqlState) {
    case "23505": // unique_violation — duplicate name in this workspace
      return "A department with this name already exists.";
    case "23514": // check_violation — name length / status bounds
      return "That department name isn't valid. Use 1–120 characters.";
    case "42501": // insufficient_privilege — RLS denied
      return "You don't have permission to manage departments in this workspace.";
    case "PGRST116": // no row returned — target not in this workspace
      return "That department could not be found in this workspace.";
    default:
      return "We couldn't save that department. Please try again.";
  }
}
