import { useQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { fetchPortalPublishedShifts } from "../api/portalLiveData";
import type { PortalShift } from "../types";

const portalRouteApi = getRouteApi("/portal");

export type PortalLiveShifts = {
  /** True when a live, authenticated staff session can be queried at all. */
  enabled: boolean;
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
  data: PortalShift[] | undefined;
};

/**
 * Live published shifts for the signed-in staff member, read straight from the
 * staff-safe `staff_portal_published_shifts` view. Only runs when Supabase is
 * configured and the resolved auth state is an active staff membership; every
 * other case (no env, manager, unauthenticated) leaves this disabled so the
 * caller can fall back to the demo WorkspaceStore.
 */
export function usePortalLiveShifts(): PortalLiveShifts {
  const { auth } = portalRouteApi.useRouteContext();

  const workspaceId = auth.status === "member" ? auth.workspaceId : null;
  const staffMemberId = auth.status === "member" ? auth.staffMemberId : null;
  const enabled =
    Boolean(getSupabaseEnv()) &&
    auth.status === "member" &&
    auth.role === "staff" &&
    Boolean(staffMemberId);

  const query = useQuery({
    queryKey: ["portal", "published-shifts", workspaceId, staffMemberId],
    queryFn: () => fetchPortalPublishedShifts(workspaceId!, staffMemberId!),
    enabled,
    staleTime: 30_000,
  });

  return {
    enabled,
    isLoading: query.isLoading,
    isError: query.isError,
    isSuccess: query.isSuccess,
    data: query.data,
  };
}
