import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Decides which department a shift belongs to.
 *
 * The shift is the authority. When a manager names a department explicitly it
 * wins outright; the assigned staff member's own department is only a fallback
 * for shifts that never named one. Resolving a department never writes to
 * `staff_members` — moving a shift into Events does not move the person.
 *
 * An explicit id is always re-checked against the caller's workspace and must be
 * active, so a well-formed uuid from another tenant is rejected rather than
 * trusted.
 */

export interface DepartmentRow {
  id: string;
  name: string;
}

export class DepartmentAuthorityError extends Error {}

async function requireActiveWorkspaceDepartment(
  supabase: SupabaseClient,
  workspaceId: string,
  departmentId: string,
): Promise<string> {
  const { data, error } = await supabase
    .from("departments")
    .select("id, status")
    .eq("workspace_id", workspaceId)
    .eq("id", departmentId)
    .maybeSingle();
  if (error) throw error;
  // Missing row covers both "does not exist" and "belongs to another workspace",
  // because the query is workspace-scoped and RLS applies.
  if (!data) {
    throw new DepartmentAuthorityError("That department is not available in this workspace.");
  }
  if ((data as { status: string }).status !== "active") {
    throw new DepartmentAuthorityError("That department is no longer active.");
  }
  return (data as { id: string }).id;
}

async function activeDepartments(
  supabase: SupabaseClient,
  workspaceId: string,
): Promise<DepartmentRow[]> {
  // Created order makes the first row the workspace's starter/default department,
  // so the fallback stays deterministic.
  const { data, error } = await supabase
    .from("departments")
    .select("id, name")
    .eq("workspace_id", workspaceId)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .order("name", { ascending: true });
  if (error) throw error;
  return ((data as DepartmentRow[] | null) ?? []).filter(Boolean);
}

export interface ActiveStaffAssignment {
  id: string;
  departmentId: string | null;
}

/** Confirms the staff member is active here and reports their own department. */
export async function resolveActiveStaffAssignment(
  supabase: SupabaseClient,
  workspaceId: string,
  staffId: string,
): Promise<ActiveStaffAssignment> {
  const { data, error } = await supabase
    .from("staff_members")
    .select("id, department_id, employment_status")
    .eq("workspace_id", workspaceId)
    .eq("id", staffId)
    .maybeSingle();
  if (error) throw error;
  if (!data || (data as { employment_status: string }).employment_status !== "active") {
    throw new Error("Assigned staff member is not active in this workspace");
  }
  return {
    id: (data as { id: string }).id,
    departmentId: ((data as { department_id: string | null }).department_id ?? null) || null,
  };
}

export type ResolveDepartmentInput = {
  /** What the manager chose. Wins whenever it is present and valid. */
  departmentId?: string | null;
  staffId: string | null;
  /**
   * The shift's current department. Present only on update, where it outranks
   * the staff member's own department.
   */
  existingDepartmentId?: string | null;
};

async function workspaceDefaultDepartmentId(
  supabase: SupabaseClient,
  workspaceId: string,
): Promise<string> {
  const active = await activeDepartments(supabase, workspaceId);
  if (active.length === 0) {
    throw new DepartmentAuthorityError(
      "Add a department to this workspace before scheduling shifts.",
    );
  }
  return active[0]!.id;
}

/**
 * Create precedence:
 *   1. explicit active workspace department
 *   2. the assigned staff member's active department
 *   3. the active workspace default
 *   4. fail honestly when the workspace has no department at all
 */
export async function resolveDepartmentForCreate(
  supabase: SupabaseClient,
  workspaceId: string,
  input: { departmentId?: string | null; staffId: string | null },
): Promise<string> {
  if (input.departmentId) {
    return requireActiveWorkspaceDepartment(supabase, workspaceId, input.departmentId);
  }
  if (input.staffId) {
    const assigned = await resolveActiveStaffAssignment(supabase, workspaceId, input.staffId);
    if (assigned.departmentId) return assigned.departmentId;
  }
  return workspaceDefaultDepartmentId(supabase, workspaceId);
}

/**
 * Update precedence:
 *   1. explicit department supplied in the patch
 *   2. the shift's existing department
 *   3. the assigned staff member's department, only when the existing one is
 *      absent
 *   4. the active workspace default
 *
 * Step 2 outranking step 3 is the whole point: reassigning a shift to someone
 * from another department must not drag the shift along with them. An existing
 * department is kept even if it has since been deactivated, so historical
 * shifts stay where they were actually worked.
 */
export async function resolveDepartmentForUpdate(
  supabase: SupabaseClient,
  workspaceId: string,
  input: ResolveDepartmentInput,
): Promise<string> {
  if (input.departmentId) {
    return requireActiveWorkspaceDepartment(supabase, workspaceId, input.departmentId);
  }
  if (input.existingDepartmentId) return input.existingDepartmentId;
  if (input.staffId) {
    const assigned = await resolveActiveStaffAssignment(supabase, workspaceId, input.staffId);
    if (assigned.departmentId) return assigned.departmentId;
  }
  return workspaceDefaultDepartmentId(supabase, workspaceId);
}

export async function listActiveDepartments(
  supabase: SupabaseClient,
  workspaceId: string,
): Promise<DepartmentRow[]> {
  return activeDepartments(supabase, workspaceId);
}
