import { useQuery } from "@tanstack/react-query";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { useManagerIdentity } from "@/features/auth/hooks/useManagerIdentity";
import { fetchLeaveTeamBalancesFn, type LeaveBalancesResult } from "../api/leaveEntitlements";
import { leaveQueryKeys } from "../lib/leaveQueryRange";

export type LeaveBalancesView = {
  /** True when live balances can be read for the active manager workspace. */
  enabled: boolean;
  isLoading: boolean;
  isError: boolean;
  /** Null until a successful read. */
  result: LeaveBalancesResult | null;
};

/**
 * Team leave balances for the leave year containing today.
 *
 * Deliberately its own hook rather than state on `useLeaveController`: that hook
 * owns operational request state, is close to its line guardrail, and has a
 * different cache lifetime. Sharing the `["leave", workspaceId]` key prefix
 * means a leave decision already refreshes these balances.
 */
export function useLeaveBalances(): LeaveBalancesView {
  const { workspaceId, role } = useManagerIdentity();
  const enabled =
    Boolean(getSupabaseEnv()) && workspaceId !== null && (role === "owner" || role === "manager");

  const query = useQuery({
    queryKey: leaveQueryKeys.teamBalances(workspaceId),
    queryFn: () => fetchLeaveTeamBalancesFn({ data: { workspaceId: workspaceId! } }),
    enabled,
    staleTime: 15_000,
  });

  return {
    enabled,
    isLoading: enabled && query.isLoading,
    isError: enabled && query.isError,
    result: query.data ?? null,
  };
}
