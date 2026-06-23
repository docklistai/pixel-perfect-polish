import { useQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { fetchPortalLeaveRequests, upcomingApprovedLeaveRequests } from "../api/portalLiveData";
import type { PortalLeaveRequest } from "../api/portalLiveData";

const portalRouteApi = getRouteApi("/portal");

export type PortalLeaveRequestsState = {
  isLive: boolean;
  isLoading: boolean;
  approvedLeave: PortalLeaveRequest[];
  requestHistory: PortalLeaveRequest[];
};

export function usePortalLeaveRequests(): PortalLeaveRequestsState {
  const { auth } = portalRouteApi.useRouteContext();

  const workspaceId = auth.status === "member" ? auth.workspaceId : null;
  const staffMemberId = auth.status === "member" ? auth.staffMemberId : null;
  const enabled =
    Boolean(getSupabaseEnv()) &&
    auth.status === "member" &&
    auth.role === "staff" &&
    Boolean(staffMemberId);

  const query = useQuery({
    queryKey: ["portal", "leave-requests", workspaceId, staffMemberId],
    queryFn: () => fetchPortalLeaveRequests(workspaceId!, staffMemberId!),
    enabled,
    staleTime: 15_000,
  });

  const isLive = enabled && query.isSuccess;
  const data = query.data ?? [];

  const todayIso = new Date().toISOString().slice(0, 10);

  const approvedLeave = upcomingApprovedLeaveRequests(data, todayIso);

  return {
    isLive,
    isLoading: query.isLoading && enabled,
    approvedLeave: isLive ? approvedLeave : [],
    requestHistory: isLive ? data : [],
  };
}
