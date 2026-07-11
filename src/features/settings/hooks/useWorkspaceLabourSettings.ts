import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { useManagerIdentity } from "@/features/auth/hooks/useManagerIdentity";
import {
  fetchWorkspaceLabourSettingsFn,
  saveWorkspaceLabourSettingsFn,
  type SaveWorkspaceLabourSettingsInput,
  type WorkspaceLabourSettings,
} from "../api/workspaceSettings";

const LABOUR_SETTINGS_KEY = (workspaceId: string | null) => ["settings", "labour", workspaceId];

export type WorkspaceLabourSettingsView = {
  /** True when live settings can be read for the active manager workspace. */
  enabled: boolean;
  isLoading: boolean;
  isError: boolean;
  /** Null while loading, errored, disabled, or when nothing has been saved yet. */
  settings: WorkspaceLabourSettings | null;
  /** True when the read succeeded but the workspace has never saved settings. */
  isUnset: boolean;
};

/** Live labour planning settings for the active manager workspace. */
export function useWorkspaceLabourSettings(): WorkspaceLabourSettingsView {
  const { workspaceId, role } = useManagerIdentity();
  const enabled =
    Boolean(getSupabaseEnv()) && workspaceId !== null && (role === "owner" || role === "manager");

  const query = useQuery({
    queryKey: LABOUR_SETTINGS_KEY(workspaceId),
    queryFn: () => fetchWorkspaceLabourSettingsFn(),
    enabled,
    staleTime: 30_000,
  });

  return {
    enabled,
    isLoading: enabled && query.isLoading,
    isError: enabled && query.isError,
    settings: query.data?.settings ?? null,
    isUnset: query.isSuccess && query.data.settings === null,
  };
}

/** Saves labour settings and refreshes every consumer of the settings query. */
export function useSaveWorkspaceLabourSettings() {
  const queryClient = useQueryClient();
  const { workspaceId } = useManagerIdentity();

  return useMutation({
    mutationFn: (input: SaveWorkspaceLabourSettingsInput) =>
      saveWorkspaceLabourSettingsFn({ data: input }),
    onSuccess: (result) => {
      queryClient.setQueryData(LABOUR_SETTINGS_KEY(workspaceId), result);
    },
  });
}
