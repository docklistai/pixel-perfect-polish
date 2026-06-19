import { useQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { fetchWorkspaceDepartmentsFn } from "../api/staffLiveData";
import type { WorkspaceDepartment } from "../types";

const staffRouteApi = getRouteApi("/staff");

/**
 * Live workspace departments for the Add Staff picker. Mirrors the gating of
 * {@link useWorkspaceStaff}: only enabled for an authenticated owner/manager
 * with Supabase configured. The caller can further gate with `enabled` (e.g. to
 * defer the read until the Add Staff dialog opens). Demo mode returns `[]` so
 * the picker simply offers "Unassigned".
 */
export function useWorkspaceDepartments(options: { enabled?: boolean } = {}): {
  departments: WorkspaceDepartment[];
  isLoading: boolean;
} {
  const { auth } = staffRouteApi.useRouteContext();
  const workspaceId = auth.status === "member" ? auth.workspaceId : null;
  const enabled =
    (options.enabled ?? true) &&
    Boolean(getSupabaseEnv()) &&
    auth.status === "member" &&
    (auth.role === "owner" || auth.role === "manager");

  const query = useQuery({
    queryKey: ["staff", "workspace-departments", workspaceId],
    queryFn: () => fetchWorkspaceDepartmentsFn(),
    enabled,
    staleTime: 60_000,
  });

  return {
    departments: enabled && query.isSuccess ? (query.data ?? []) : [],
    isLoading: enabled && query.isLoading,
  };
}
