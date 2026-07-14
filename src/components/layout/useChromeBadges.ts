import { useQuery } from "@tanstack/react-query";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { useManagerIdentity } from "@/features/auth/hooks/useManagerIdentity";
import { fetchWorkspaceRotaWeekFn } from "@/features/rota/api/rotaLiveData";
import { fetchPendingLeaveCountFn } from "@/features/leave/api/leaveLiveData";
import { leaveQueryKeys } from "@/features/leave/lib/leaveQueryRange";
import { fetchTimeOperationalCountsFn } from "@/features/time/api/timeOperationalReads";
import {
  rollingTimeRange,
  TIME_OPERATIONAL_LOOKBACK_DAYS,
  timeQueryKeys,
} from "@/features/time/lib/timeQueryRange";
import { countOpenShifts } from "@/features/rota/lib/rotaSummaries";

export interface ChromeBadges {
  /** Open shifts on the current live week. */
  rota: number;
  /** Time entries awaiting approval. */
  time: number;
  /** Leave requests awaiting a decision. */
  leave: number;
}

/**
 * Live counts for the global manager chrome (sidebar nav badges). They share the
 * exact query keys the dashboard and feature pages use, so the reads dedupe.
 *
 * Returns `null` when there is no live workspace to read from (e.g. Supabase
 * unconfigured), so the chrome shows no badge rather than a demo-store count.
 * While a live read is still loading or has errored, counts fall through to a
 * safe zero — the badge hides rather than flashing a stale or fabricated number.
 */
export function useChromeBadges(): ChromeBadges | null {
  const { workspaceId, role } = useManagerIdentity();
  const enabled =
    Boolean(getSupabaseEnv()) && Boolean(workspaceId) && (role === "owner" || role === "manager");
  const timeRange = rollingTimeRange(new Date(), TIME_OPERATIONAL_LOOKBACK_DAYS);

  const weekQuery = useQuery({
    queryKey: ["rota", "workspace-week", workspaceId, 0, null],
    queryFn: () => fetchWorkspaceRotaWeekFn({ data: { weekOffset: 0 } }),
    enabled,
    staleTime: 15_000,
  });
  const leaveQuery = useQuery({
    queryKey: leaveQueryKeys.pendingCount(workspaceId),
    queryFn: () => fetchPendingLeaveCountFn({ data: { workspaceId: workspaceId! } }),
    enabled,
    staleTime: 15_000,
  });
  const timeQuery = useQuery({
    queryKey: timeQueryKeys.operationalCounts(workspaceId, timeRange),
    queryFn: () =>
      fetchTimeOperationalCountsFn({ data: { workspaceId: workspaceId!, ...timeRange } }),
    enabled,
    staleTime: 15_000,
  });

  if (!enabled) return null;

  return {
    rota: weekQuery.data ? countOpenShifts(weekQuery.data.shifts) : 0,
    leave: leaveQuery.data ?? 0,
    time: timeQuery.data?.awaitingReview ?? 0,
  };
}
