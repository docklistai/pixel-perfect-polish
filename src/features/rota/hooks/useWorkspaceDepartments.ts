import { useQuery } from "@tanstack/react-query";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { useManagerIdentity } from "@/features/auth/hooks/useManagerIdentity";
import { fetchWorkspaceDepartmentsFn, type WorkspaceDepartment } from "../api/workspaceDepartments";

const KEY = (workspaceId: string | null) => ["rota", "workspace-departments", workspaceId];

export type WorkspaceDepartmentsState = {
  /** False when there is no live workspace (demo/preview); pickers stay hidden. */
  enabled: boolean;
  isLoading: boolean;
  isError: boolean;
  departments: WorkspaceDepartment[];
  /** Department id → name, including nothing for departments that no longer exist. */
  nameById: Map<string, string>;
  /** True once loaded and the workspace genuinely has no active department. */
  isEmpty: boolean;
};

/**
 * Active departments for the current workspace, used to populate the rota's
 * department pickers. These are the workspace's real departments — the rota
 * must never present a hard-coded list as if it were configuration.
 */
export function useWorkspaceDepartments(): WorkspaceDepartmentsState {
  const { workspaceId } = useManagerIdentity();
  const enabled = Boolean(getSupabaseEnv()) && Boolean(workspaceId);

  const query = useQuery({
    queryKey: KEY(workspaceId),
    queryFn: async () => (await fetchWorkspaceDepartmentsFn()).departments,
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  const departments = query.data ?? [];
  return {
    enabled,
    isLoading: enabled && query.isLoading,
    isError: query.isError,
    departments,
    nameById: new Map(departments.map((department) => [department.id, department.name])),
    isEmpty: enabled && !query.isLoading && !query.isError && departments.length === 0,
  };
}
