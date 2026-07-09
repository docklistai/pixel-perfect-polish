import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { useManagerIdentity } from "@/features/auth/hooks/useManagerIdentity";
import {
  fetchStaffPayRatesFn,
  saveStaffPayRateFn,
  type SaveStaffPayRateInput,
} from "../api/staffPayRates";

const PAY_RATES_KEY = (workspaceId: string | null) => ["staff", "pay-rates", workspaceId];

/** Manager-only map of staff id → hourly rate (pence) for the active workspace. */
export function useStaffPayRates() {
  const { workspaceId, role } = useManagerIdentity();
  const enabled =
    Boolean(getSupabaseEnv()) &&
    workspaceId !== null &&
    (role === "owner" || role === "manager");

  const query = useQuery({
    queryKey: PAY_RATES_KEY(workspaceId),
    queryFn: () => fetchStaffPayRatesFn(),
    enabled,
    staleTime: 30_000,
  });

  return {
    enabled,
    isLoading: enabled && query.isLoading,
    isError: enabled && query.isError,
    rates: query.data?.rates ?? {},
  };
}

/** Saves or clears one staff member's hourly rate and refreshes the rate map. */
export function useSaveStaffPayRate() {
  const queryClient = useQueryClient();
  const { workspaceId } = useManagerIdentity();

  return useMutation({
    mutationFn: (input: SaveStaffPayRateInput) => saveStaffPayRateFn({ data: input }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PAY_RATES_KEY(workspaceId) });
    },
  });
}
