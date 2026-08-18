import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { useManagerIdentity } from "@/features/auth/hooks/useManagerIdentity";
import {
  fetchWorkspaceLabsFn,
  saveWorkspaceLabsFn,
  LABS_FLAGS_OFF,
  type SaveWorkspaceLabsInput,
  type WorkspaceLabsFlags,
} from "../api/workspaceLabs";

export const labsQueryKey = (workspaceId: string | null) => ["settings", "labs", workspaceId];

export type WorkspaceLabsView = {
  /** True when Labs flags can be read for the active manager workspace. */
  enabled: boolean;
  isLoading: boolean;
  isError: boolean;
  /**
   * Resolved flags. Every experiment reads OFF until a successful read says
   * otherwise, so a loading, errored, signed-out, or demo surface can never
   * switch an experiment on by accident.
   */
  flags: WorkspaceLabsFlags;
};

/** Live Labs flags for the active manager workspace. */
export function useWorkspaceLabs(): WorkspaceLabsView {
  const { workspaceId, role } = useManagerIdentity();
  const enabled =
    Boolean(getSupabaseEnv()) && workspaceId !== null && (role === "owner" || role === "manager");

  const query = useQuery({
    queryKey: labsQueryKey(workspaceId),
    queryFn: () => fetchWorkspaceLabsFn(),
    enabled,
    staleTime: 30_000,
  });

  return {
    enabled,
    isLoading: enabled && query.isLoading,
    isError: enabled && query.isError,
    flags: query.data ?? LABS_FLAGS_OFF,
  };
}

/** Saves Labs flags and refreshes every consumer of the Labs query. */
export function useSaveWorkspaceLabs() {
  const queryClient = useQueryClient();
  const { workspaceId } = useManagerIdentity();

  return useMutation({
    mutationFn: (input: SaveWorkspaceLabsInput) => saveWorkspaceLabsFn({ data: input }),
    onSuccess: (flags) => {
      queryClient.setQueryData(labsQueryKey(workspaceId), flags);
    },
  });
}
