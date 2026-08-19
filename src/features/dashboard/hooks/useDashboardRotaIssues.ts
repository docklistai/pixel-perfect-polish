import { useQuery } from "@tanstack/react-query";
import { fetchRotaOperationalIssuesFn } from "@/features/rota/api/rotaOperationalIssues";
import { rotaOperationalIssuesPrefix } from "@/features/rota/hooks/useRotaOperationalIssues";

/**
 * Open rota operational issues, read from Home.
 *
 * `useRotaOperationalIssues` cannot be reused here: it resolves its caller from
 * `getRouteApi("/rota")`, so it only works while that route is active. This
 * hook takes the authorisation its caller has already resolved instead, which
 * keeps it route-agnostic and avoids chaining a second identity read.
 *
 * The query key is deliberately the same one `/rota` uses, so moving between
 * Home and the rota shares one cache entry rather than issuing a second fetch.
 * There is no `refetchInterval`: a dashboard left open never polls.
 */
export interface DashboardRotaIssuesState {
  enabled: boolean;
  isLoading: boolean;
  isError: boolean;
  /** Open issue count. Meaningful only while `resolved` is true. */
  count: number;
  /**
   * True only after a successful read. Loading, failed and disabled states all
   * report false so a count of 0 can never be mistaken for "no issues".
   */
  resolved: boolean;
  refresh: () => void;
}

export function useDashboardRotaIssues(input: {
  /** True when the caller is an owner/manager on a live Supabase surface. */
  enabled: boolean;
  workspaceId: string | null;
  rotaWeekId: string | null;
}): DashboardRotaIssuesState {
  const { workspaceId, rotaWeekId } = input;
  const enabled = input.enabled && Boolean(rotaWeekId);

  const query = useQuery({
    queryKey: [...rotaOperationalIssuesPrefix, workspaceId, rotaWeekId],
    queryFn: () => fetchRotaOperationalIssuesFn({ data: { rotaWeekId: rotaWeekId! } }),
    enabled,
    staleTime: 15_000,
  });

  return {
    enabled,
    isLoading: enabled && query.isLoading,
    isError: enabled && query.isError,
    count: query.data?.length ?? 0,
    resolved: enabled && query.isSuccess,
    refresh: () => {
      if (!enabled) return;
      void query.refetch();
    },
  };
}
