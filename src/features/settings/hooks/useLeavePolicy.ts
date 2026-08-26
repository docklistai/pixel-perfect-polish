import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { useManagerIdentity } from "@/features/auth/hooks/useManagerIdentity";
import {
  fetchLeavePolicyFn,
  saveLeavePolicyFn,
  type SaveLeavePolicyInput,
  type WorkspaceLeavePolicy,
} from "../api/leavePolicy";

const LEAVE_POLICY_KEY = (workspaceId: string | null) => ["settings", "leave-policy", workspaceId];

export type WorkspaceLeavePolicyView = {
  /** True when the live policy can be read for the active manager workspace. */
  enabled: boolean;
  isLoading: boolean;
  isError: boolean;
  /** Null while loading, errored or disabled. */
  policy: WorkspaceLeavePolicy | null;
};

/** The workspace's stated leave-year start and default annual entitlement. */
export function useLeavePolicy(): WorkspaceLeavePolicyView {
  const { workspaceId, role } = useManagerIdentity();
  const enabled =
    Boolean(getSupabaseEnv()) && workspaceId !== null && (role === "owner" || role === "manager");

  const query = useQuery({
    queryKey: LEAVE_POLICY_KEY(workspaceId),
    queryFn: () => fetchLeavePolicyFn(),
    enabled,
    staleTime: 30_000,
  });

  return {
    enabled,
    isLoading: enabled && query.isLoading,
    isError: enabled && query.isError,
    policy: query.data?.policy ?? null,
  };
}

/**
 * Saves the workspace leave policy. Also drops every cached leave balance,
 * because changing the leave-year start month changes which window balances are
 * calculated over.
 */
export function useSaveLeavePolicy() {
  const queryClient = useQueryClient();
  const { workspaceId } = useManagerIdentity();

  return useMutation({
    mutationFn: (input: SaveLeavePolicyInput) => saveLeavePolicyFn({ data: input }),
    onSuccess: async (result) => {
      queryClient.setQueryData(LEAVE_POLICY_KEY(workspaceId), result);
      await queryClient.invalidateQueries({ queryKey: ["leave", workspaceId] });
    },
  });
}
