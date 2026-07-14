import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useManagerIdentity } from "@/features/auth/hooks/useManagerIdentity";
import { getSupabaseEnv } from "@/lib/supabase/env";
import {
  decideOneOffUnavailabilityFn,
  fetchStaffOneOffUnavailabilityFn,
  type DecideOneOffUnavailabilityInput,
  type ManagerOneOffUnavailability,
  type OneOffDecisionResult,
} from "../api/oneOffUnavailability";

export const staffOneOffUnavailabilityKey = (workspaceId: string | null) => [
  "staff",
  "one-off-unavailability",
  workspaceId,
];

export interface StaffOneOffUnavailabilityState {
  enabled: boolean;
  isLoading: boolean;
  isError: boolean;
  requests: ManagerOneOffUnavailability[];
  isDeciding: boolean;
  retry: () => void;
  decide: (input: DecideOneOffUnavailabilityInput) => Promise<OneOffDecisionResult>;
}

export function useStaffOneOffUnavailability(): StaffOneOffUnavailabilityState {
  const { workspaceId, role } = useManagerIdentity();
  const queryClient = useQueryClient();
  const enabled =
    Boolean(getSupabaseEnv()) && workspaceId !== null && (role === "owner" || role === "manager");
  const queryKey = staffOneOffUnavailabilityKey(workspaceId);
  const query = useQuery({
    queryKey,
    queryFn: () => fetchStaffOneOffUnavailabilityFn(),
    enabled,
    staleTime: 30_000,
  });
  const mutation = useMutation({
    mutationFn: (input: DecideOneOffUnavailabilityInput) =>
      decideOneOffUnavailabilityFn({ data: input }),
    onSuccess: (result) => {
      if (result.ok) {
        void Promise.all([
          queryClient.invalidateQueries({ queryKey }),
          queryClient.invalidateQueries({ queryKey: ["manager-notifications", workspaceId] }),
        ]);
      }
    },
  });
  return {
    enabled,
    isLoading: enabled && query.isLoading,
    isError: enabled && query.isError,
    requests: query.data?.requests ?? [],
    isDeciding: mutation.isPending,
    retry: () => void query.refetch(),
    decide: async (input) => {
      try {
        return await mutation.mutateAsync(input);
      } catch {
        return { ok: false, message: "We couldn't save the decision. Please try again." };
      }
    },
  };
}
