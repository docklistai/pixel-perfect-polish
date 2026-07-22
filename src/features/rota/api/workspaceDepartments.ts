import { createServerFn } from "@tanstack/react-start";
import { listActiveDepartments } from "./departmentAuthority";

/**
 * The workspace's real active departments, for the rota's department pickers.
 *
 * Read-only and workspace-scoped. The rota never creates a department — that
 * belongs to Settings — so this deliberately exposes no write path.
 */

export type WorkspaceDepartment = {
  id: string;
  name: string;
};

export const fetchWorkspaceDepartmentsFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ departments: WorkspaceDepartment[] }> => {
    const { getSupabaseServerClient } = await import("@/lib/supabase/serverClient");
    const { requireActiveManagerWorkspaceId } =
      await import("@/features/auth/api/activeManagerWorkspace");
    const supabase = getSupabaseServerClient();
    const workspaceId = await requireActiveManagerWorkspaceId(supabase);

    const departments = await listActiveDepartments(supabase, workspaceId);
    return { departments: departments.map(({ id, name }) => ({ id, name })) };
  },
);
