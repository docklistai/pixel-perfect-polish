import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { getSupabaseEnv } from "@/lib/supabase/env";
import {
  fetchPortalShiftReleaseRequests,
  requestShiftReleaseFn,
  withdrawShiftReleaseFn,
  type PortalShiftReleaseRequest,
  type ShiftReleaseWriteResult,
} from "../api/shiftReleaseRequests";

const portalRouteApi = getRouteApi("/portal");

export const portalShiftReleasesKey = (
  workspaceId: string | null,
  staffMemberId: string | null,
) => ["portal", "shift-release-requests", workspaceId, staffMemberId];

export interface PortalShiftReleasesState {
  enabled: boolean;
  isLoading: boolean;
  isError: boolean;
  requests: PortalShiftReleaseRequest[];
  requestFor: (publishedShiftId: string) => PortalShiftReleaseRequest | null;
  isSaving: boolean;
  retry: () => void;
  request: (publishedShiftId: string, reason: string) => Promise<ShiftReleaseWriteResult>;
  withdraw: (requestId: string) => Promise<ShiftReleaseWriteResult>;
}

export function usePortalShiftReleases(): PortalShiftReleasesState {
  const { auth } = portalRouteApi.useRouteContext();
  const queryClient = useQueryClient();
  const workspaceId = auth.status === "member" ? auth.workspaceId : null;
  const staffMemberId = auth.status === "member" ? auth.staffMemberId : null;
  const enabled =
    Boolean(getSupabaseEnv()) &&
    auth.status === "member" &&
    auth.role === "staff" &&
    Boolean(staffMemberId);
  const queryKey = portalShiftReleasesKey(workspaceId, staffMemberId);
  const query = useQuery({
    queryKey,
    queryFn: () => fetchPortalShiftReleaseRequests(workspaceId!),
    enabled,
    staleTime: 15_000,
  });
  const requests = React.useMemo(() => query.data ?? [], [query.data]);
  const byShift = React.useMemo(
    () => new Map(requests.map((request) => [request.publishedShiftId, request])),
    [requests],
  );
  const invalidate = () =>
    void Promise.all([
      queryClient.invalidateQueries({ queryKey }),
      queryClient.invalidateQueries({ queryKey: ["portal", "notifications", workspaceId] }),
    ]);
  const requestMutation = useMutation({
    mutationFn: ({ publishedShiftId, reason }: { publishedShiftId: string; reason: string }) =>
      requestShiftReleaseFn({ data: { workspaceId: workspaceId!, publishedShiftId, reason } }),
    onSuccess: (result) => result.ok && invalidate(),
  });
  const withdrawMutation = useMutation({
    mutationFn: (requestId: string) =>
      withdrawShiftReleaseFn({ data: { workspaceId: workspaceId!, requestId } }),
    onSuccess: (result) => result.ok && invalidate(),
  });
  return {
    enabled,
    isLoading: enabled && query.isLoading,
    isError: enabled && query.isError,
    requests,
    requestFor: (publishedShiftId) => byShift.get(publishedShiftId) ?? null,
    isSaving: requestMutation.isPending || withdrawMutation.isPending,
    retry: () => void query.refetch(),
    request: async (publishedShiftId, reason) => {
      try {
        return await requestMutation.mutateAsync({ publishedShiftId, reason });
      } catch {
        return { ok: false, message: "We couldn't send the release request. Please try again." };
      }
    },
    withdraw: async (requestId) => {
      try {
        return await withdrawMutation.mutateAsync(requestId);
      } catch {
        return {
          ok: false,
          message: "We couldn't withdraw the release request. Please try again.",
        };
      }
    },
  };
}
