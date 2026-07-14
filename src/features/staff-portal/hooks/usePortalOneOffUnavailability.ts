import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { getSupabaseEnv } from "@/lib/supabase/env";
import {
  fetchPortalOneOffUnavailability,
  requestOneOffUnavailabilityFn,
  withdrawOneOffUnavailabilityFn,
  type OneOffWriteResult,
  type PortalOneOffUnavailability,
} from "../api/oneOffUnavailability";

const portalRouteApi = getRouteApi("/portal");

export const portalOneOffUnavailabilityKey = (
  workspaceId: string | null,
  staffMemberId: string | null,
) => ["portal", "one-off-unavailability", workspaceId, staffMemberId];

export interface PortalOneOffUnavailabilityState {
  enabled: boolean;
  isLoading: boolean;
  isError: boolean;
  requests: PortalOneOffUnavailability[];
  isSaving: boolean;
  retry: () => void;
  request: (date: string, note: string | null) => Promise<OneOffWriteResult>;
  withdraw: (date: string) => Promise<OneOffWriteResult>;
}

export function usePortalOneOffUnavailability(): PortalOneOffUnavailabilityState {
  const { auth } = portalRouteApi.useRouteContext();
  const queryClient = useQueryClient();
  const workspaceId = auth.status === "member" ? auth.workspaceId : null;
  const staffMemberId = auth.status === "member" ? auth.staffMemberId : null;
  const enabled =
    Boolean(getSupabaseEnv()) &&
    auth.status === "member" &&
    auth.role === "staff" &&
    Boolean(staffMemberId);
  const queryKey = portalOneOffUnavailabilityKey(workspaceId, staffMemberId);
  const query = useQuery({
    queryKey,
    queryFn: () => fetchPortalOneOffUnavailability(workspaceId!),
    enabled,
    staleTime: 30_000,
  });
  const invalidate = () =>
    void Promise.all([
      queryClient.invalidateQueries({ queryKey }),
      queryClient.invalidateQueries({ queryKey: ["portal", "notifications", workspaceId] }),
    ]);
  const requestMutation = useMutation({
    mutationFn: ({ date, note }: { date: string; note: string | null }) =>
      requestOneOffUnavailabilityFn({ data: { workspaceId: workspaceId!, date, note } }),
    onSuccess: (result) => result.ok && invalidate(),
  });
  const withdrawMutation = useMutation({
    mutationFn: (date: string) =>
      withdrawOneOffUnavailabilityFn({ data: { workspaceId: workspaceId!, date } }),
    onSuccess: (result) => result.ok && invalidate(),
  });
  return {
    enabled,
    isLoading: enabled && query.isLoading,
    isError: enabled && query.isError,
    requests: query.data ?? [],
    isSaving: requestMutation.isPending || withdrawMutation.isPending,
    retry: () => void query.refetch(),
    request: async (date, note) => {
      try {
        return await requestMutation.mutateAsync({ date, note });
      } catch {
        return { ok: false, message: "We couldn't send the request. Please try again." };
      }
    },
    withdraw: async (date) => {
      try {
        return await withdrawMutation.mutateAsync(date);
      } catch {
        return { ok: false, message: "We couldn't withdraw the request. Please try again." };
      }
    },
  };
}
