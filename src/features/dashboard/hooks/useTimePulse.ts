import { useQuery } from "@tanstack/react-query";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { useManagerIdentity } from "@/features/auth/hooks/useManagerIdentity";
import { useWorkspaceLabs } from "@/features/settings/hooks/useWorkspaceLabs";
import { fetchTimePulseFn, type TimePulseResult } from "@/features/time/api/timePulseRead";
import { shouldReadTimePulse } from "../lib/timePulseGate";

/**
 * Time Pulse data for Home, gated on the Labs flag.
 *
 * OFF means off: `enabled` folds the persisted flag into TanStack Query's own
 * gate, so while the experiment is off the query never runs, no clock data is
 * requested, and nothing is computed or cached.
 *
 * Refreshing is deliberately manual. There is no `refetchInterval`, so a board
 * left open never polls clock data in the background; instead the card states
 * the time its data was taken and offers a Refresh control, which is honest
 * about staleness rather than hiding it behind a timer. `refresh()` is inert
 * while the experiment is off, so the control can never become a way to read
 * attendance that the flag has switched off.
 */
export function useTimePulse() {
  const { workspaceId, role } = useManagerIdentity();
  const labs = useWorkspaceLabs();

  const enabled = shouldReadTimePulse({
    hasSupabase: Boolean(getSupabaseEnv()),
    workspaceId,
    role,
    labsTimePulseEnabled: labs.flags.timePulse,
  });

  const query = useQuery({
    queryKey: ["time-pulse", workspaceId],
    queryFn: () => fetchTimePulseFn(),
    enabled,
    staleTime: 30_000,
  });

  return {
    /** True only when the experiment is on for a manager in a live workspace. */
    enabled,
    isLoading: enabled && query.isLoading,
    isError: enabled && query.isError,
    /** True while a manual refresh is in flight over data already on screen. */
    isRefreshing: enabled && query.isFetching && !query.isLoading,
    data: (query.data ?? null) as TimePulseResult | null,
    refresh: () => {
      if (!enabled) return;
      void query.refetch();
    },
  };
}
