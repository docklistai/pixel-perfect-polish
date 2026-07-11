import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { useManagerIdentity } from "@/features/auth/hooks/useManagerIdentity";
import {
  decideRecurringDayOffFn,
  fetchStaffRecurringDaysOffFn,
  type DecideRecurringDayOffInput,
  type ManagerRecurringDayOff,
} from "../api/recurringDaysOff";

const KEY = (workspaceId: string | null) => ["staff", "recurring-days-off", workspaceId];

export type StaffRecurringDaysOffState = {
  enabled: boolean;
  isLoading: boolean;
  isError: boolean;
  /** All standing day-off requests in the active manager workspace. */
  requests: ManagerRecurringDayOff[];
  isDeciding: boolean;
  decide: (
    input: DecideRecurringDayOffInput,
  ) => Promise<{ ok: true } | { ok: false; message: string }>;
};

/** Manager view of standing day-off requests, with approve/decline. */
export function useStaffRecurringDaysOff(): StaffRecurringDaysOffState {
  const { workspaceId, role } = useManagerIdentity();
  const queryClient = useQueryClient();
  const enabled =
    Boolean(getSupabaseEnv()) && workspaceId !== null && (role === "owner" || role === "manager");

  const query = useQuery({
    queryKey: KEY(workspaceId),
    queryFn: () => fetchStaffRecurringDaysOffFn(),
    enabled,
    staleTime: 30_000,
  });

  const decideMutation = useMutation({
    mutationFn: (input: DecideRecurringDayOffInput) => decideRecurringDayOffFn({ data: input }),
    onSuccess: (result) => {
      if (result.ok) void queryClient.invalidateQueries({ queryKey: KEY(workspaceId) });
    },
  });

  return {
    enabled,
    isLoading: enabled && query.isLoading,
    isError: enabled && query.isError,
    requests: query.data?.requests ?? [],
    isDeciding: decideMutation.isPending,
    decide: (input) => decideMutation.mutateAsync(input),
  };
}
