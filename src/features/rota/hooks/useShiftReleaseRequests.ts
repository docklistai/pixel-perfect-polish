import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { getSupabaseEnv } from "@/lib/supabase/env";
import {
  approveShiftReleaseFn,
  declineShiftReleaseFn,
  type ShiftReleaseDecisionInput,
  type ShiftReleaseDecisionResult,
} from "../api/shiftReleaseDecisions";
import {
  fetchShiftReleaseRequestsFn,
  type ManagerShiftReleaseRequest,
} from "../api/shiftReleaseRequests";

const rotaRouteApi = getRouteApi("/rota");
export const shiftReleaseRequestsKey = (workspaceId: string | null, rotaWeekId: string | null) => [
  "rota",
  "shift-release-requests",
  workspaceId,
  rotaWeekId,
];

export interface ShiftReleaseRequestsState {
  enabled: boolean;
  isLoading: boolean;
  isError: boolean;
  requests: ManagerShiftReleaseRequest[];
  requestsFor: (sourceShiftId: string) => ManagerShiftReleaseRequest[];
  isDeciding: boolean;
  retry: () => void;
  approve: (input: ShiftReleaseDecisionInput) => Promise<ShiftReleaseDecisionResult>;
  decline: (input: ShiftReleaseDecisionInput) => Promise<ShiftReleaseDecisionResult>;
}

export function useShiftReleaseRequests(rotaWeekId: string | null): ShiftReleaseRequestsState {
  const { auth } = rotaRouteApi.useRouteContext();
  const queryClient = useQueryClient();
  const workspaceId = auth.status === "member" ? auth.workspaceId : null;
  const enabled =
    Boolean(getSupabaseEnv()) &&
    auth.status === "member" &&
    (auth.role === "owner" || auth.role === "manager") &&
    Boolean(rotaWeekId);
  const queryKey = shiftReleaseRequestsKey(workspaceId, rotaWeekId);
  const query = useQuery({
    queryKey,
    queryFn: () => fetchShiftReleaseRequestsFn({ data: { rotaWeekId: rotaWeekId! } }),
    enabled,
    staleTime: 15_000,
  });
  const requests = React.useMemo(() => query.data ?? [], [query.data]);
  const byShift = React.useMemo(() => {
    const map = new Map<string, ManagerShiftReleaseRequest[]>();
    for (const request of requests) {
      const list = map.get(request.sourceShiftId) ?? [];
      list.push(request);
      map.set(request.sourceShiftId, list);
    }
    return map;
  }, [requests]);
  const onSuccess = async (result: ShiftReleaseDecisionResult) => {
    if (!result.ok) return;
    await Promise.all([
      queryClient.invalidateQueries({ queryKey }),
      queryClient.invalidateQueries({ queryKey: ["rota", "workspace-week", workspaceId] }),
      queryClient.invalidateQueries({ queryKey: ["manager-notifications", workspaceId] }),
    ]);
  };
  const approve = useMutation({
    mutationFn: (input: ShiftReleaseDecisionInput) => approveShiftReleaseFn({ data: input }),
    onSuccess,
  });
  const decline = useMutation({
    mutationFn: (input: ShiftReleaseDecisionInput) => declineShiftReleaseFn({ data: input }),
    onSuccess,
  });
  return {
    enabled,
    isLoading: enabled && query.isLoading,
    isError: enabled && query.isError,
    requests,
    requestsFor: (sourceShiftId) => byShift.get(sourceShiftId) ?? [],
    isDeciding: approve.isPending || decline.isPending,
    retry: () => void query.refetch(),
    approve: async (input) => {
      try {
        return await approve.mutateAsync(input);
      } catch {
        return { ok: false, message: "We couldn't approve the release. Please try again." };
      }
    },
    decline: async (input) => {
      try {
        return await decline.mutateAsync(input);
      } catch {
        return { ok: false, message: "We couldn't decline the release. Please try again." };
      }
    },
  };
}
