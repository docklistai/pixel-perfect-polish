import { createServerFn } from "@tanstack/react-start";

export interface WorkspaceStructureCounts {
  activeLocationCount: number;
  activeDepartmentCount: number;
}

/**
 * Active location and department counts for the first-run setup checklist.
 *
 * Read-only and workspace-scoped. A rota week is scheduled against a location
 * and Build the Week counts demand per department, so the setup panel needs to
 * know whether both exist before telling a manager their workspace is ready.
 */
export const fetchWorkspaceStructureFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<WorkspaceStructureCounts> => {
    const { getSupabaseServerClient } = await import("@/lib/supabase/serverClient");
    const { requireActiveManagerWorkspaceId } =
      await import("@/features/auth/api/activeManagerWorkspace");
    const supabase = getSupabaseServerClient();
    const workspaceId = await requireActiveManagerWorkspaceId(supabase);

    const [locations, departments] = await Promise.all([
      supabase
        .from("locations")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .eq("status", "active"),
      supabase
        .from("departments")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .eq("status", "active"),
    ]);

    if (locations.error) throw locations.error;
    if (departments.error) throw departments.error;

    return {
      activeLocationCount: locations.count ?? 0,
      activeDepartmentCount: departments.count ?? 0,
    };
  },
);
