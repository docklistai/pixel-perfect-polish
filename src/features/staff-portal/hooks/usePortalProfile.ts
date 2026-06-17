import { useQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { fetchPortalProfile } from "../api/portalLiveData";
import type { PortalProfile } from "../types";

const portalRouteApi = getRouteApi("/portal");

export type PortalProfileState = {
  enabled: boolean;
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
  data: PortalProfile | null;
};

export function usePortalProfile(): PortalProfileState {
  const { auth } = portalRouteApi.useRouteContext();

  const workspaceId = auth.status === "member" ? auth.workspaceId : null;
  const staffMemberId = auth.status === "member" ? auth.staffMemberId : null;
  const enabled =
    Boolean(getSupabaseEnv()) &&
    auth.status === "member" &&
    auth.role === "staff" &&
    Boolean(staffMemberId);

  const query = useQuery({
    queryKey: ["portal", "profile", workspaceId, staffMemberId],
    queryFn: () => fetchPortalProfile(workspaceId!, staffMemberId!),
    enabled,
    staleTime: 30_000,
  });

  return {
    enabled,
    isLoading: query.isLoading,
    isError: query.isError,
    isSuccess: query.isSuccess,
    data: query.data ?? null,
  };
}
