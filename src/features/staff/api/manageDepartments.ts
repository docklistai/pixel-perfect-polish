import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { describeDepartmentWriteError, DEPARTMENT_NAME_MAX } from "../lib/departmentName";
import type { DepartmentWriteResult, ManageableDepartment } from "../types";

/**
 * Manager-side department management. Each function runs as a server function
 * bound to the caller's session cookie, with the active workspace resolved
 * server-side — `workspace_id` is never trusted from the client. Writes go
 * through the existing `departments_manager_all` RLS policy and the table's
 * `authenticated` grants, so this adds no schema, RLS, or RPC surface. Archive
 * is a soft `status = 'inactive'`; the row is never deleted, so shifts and staff
 * that reference it stay intact and the unique name stays reserved.
 */

const nameSchema = z.string().trim().min(1).max(DEPARTMENT_NAME_MAX);
const idSchema = z.string().uuid();

async function managerWorkspace() {
  const { getSupabaseServerClient } = await import("@/lib/supabase/serverClient");
  const { requireActiveManagerWorkspaceId } =
    await import("@/features/auth/api/activeManagerWorkspace");
  const supabase = getSupabaseServerClient();
  const workspaceId = await requireActiveManagerWorkspaceId(supabase);
  return { supabase, workspaceId };
}

/** All departments for the workspace (active and archived), name-ordered. */
export const fetchManageableDepartmentsFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<ManageableDepartment[]> => {
    const { supabase, workspaceId } = await managerWorkspace();
    const { data, error } = await supabase
      .from("departments")
      .select("id, name, status")
      .eq("workspace_id", workspaceId)
      .order("status", { ascending: true })
      .order("name", { ascending: true });
    if (error) throw error;
    return (data as ManageableDepartment[] | null) ?? [];
  },
);

export const createDepartmentFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ({
    name: nameSchema.parse((input as { name: string }).name),
  }))
  .handler(async ({ data }): Promise<DepartmentWriteResult> => {
    let supabase, workspaceId;
    try {
      ({ supabase, workspaceId } = await managerWorkspace());
    } catch {
      return { ok: false, message: describeDepartmentWriteError("42501") };
    }
    const { data: inserted, error } = await supabase
      .from("departments")
      .insert({ workspace_id: workspaceId, name: data.name, status: "active" })
      .select("id")
      .single();
    if (error || !inserted) {
      return { ok: false, message: describeDepartmentWriteError(error?.code ?? null) };
    }
    return { ok: true, id: (inserted as { id: string }).id };
  });

export const renameDepartmentFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    const value = input as { id: string; name: string };
    return { id: idSchema.parse(value.id), name: nameSchema.parse(value.name) };
  })
  .handler(async ({ data }): Promise<DepartmentWriteResult> => {
    let supabase, workspaceId;
    try {
      ({ supabase, workspaceId } = await managerWorkspace());
    } catch {
      return { ok: false, message: describeDepartmentWriteError("42501") };
    }
    const { data: updated, error } = await supabase
      .from("departments")
      .update({ name: data.name })
      .eq("id", data.id)
      .eq("workspace_id", workspaceId)
      .select("id")
      .single();
    if (error || !updated) {
      return { ok: false, message: describeDepartmentWriteError(error?.code ?? "PGRST116") };
    }
    return { ok: true, id: (updated as { id: string }).id };
  });

export const setDepartmentStatusFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    const value = input as { id: string; status: "active" | "inactive" };
    return {
      id: idSchema.parse(value.id),
      status: z.enum(["active", "inactive"]).parse(value.status),
    };
  })
  .handler(async ({ data }): Promise<DepartmentWriteResult> => {
    let supabase, workspaceId;
    try {
      ({ supabase, workspaceId } = await managerWorkspace());
    } catch {
      return { ok: false, message: describeDepartmentWriteError("42501") };
    }
    const { data: updated, error } = await supabase
      .from("departments")
      .update({ status: data.status })
      .eq("id", data.id)
      .eq("workspace_id", workspaceId)
      .select("id")
      .single();
    if (error || !updated) {
      return { ok: false, message: describeDepartmentWriteError(error?.code ?? "PGRST116") };
    }
    return { ok: true, id: (updated as { id: string }).id };
  });
