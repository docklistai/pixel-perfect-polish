import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { fetchPortalLeaveRequests, upcomingApprovedLeaveRequests } from "../api/portalLiveData";
import type { PortalLeaveRequest } from "../api/portalLiveData";
import { cancelPortalLeaveRequestFn } from "../api/portalLeaveActions";
import { operationalLeaveRange } from "@/features/leave/lib/leaveQueryRange";
import { dateIsoInTimezone } from "@/features/rota/lib/liveRotaDates";
import { toast } from "sonner";
import { usePortalTimezone } from "./usePortalTimezone";

const portalRouteApi = getRouteApi("/portal");

export type PortalLeaveRequestsState = {
  enabled: boolean;
  isLive: boolean;
  isLoading: boolean;
  isError: boolean;
  retry: () => void;
  isWithdrawing: boolean;
  withdraw: (leaveRequestId: string) => void;
  approvedLeave: PortalLeaveRequest[];
  requestHistory: PortalLeaveRequest[];
};

export function usePortalLeaveRequests(): PortalLeaveRequestsState {
  const { auth } = portalRouteApi.useRouteContext();
  const queryClient = useQueryClient();
  const timezone = usePortalTimezone();

  const workspaceId = auth.status === "member" ? auth.workspaceId : null;
  const staffMemberId = auth.status === "member" ? auth.staffMemberId : null;
  const enabled =
    Boolean(getSupabaseEnv()) &&
    auth.status === "member" &&
    auth.role === "staff" &&
    Boolean(staffMemberId);

  const range = React.useMemo(() => operationalLeaveRange(), []);
  const queryKey = [
    "portal",
    "leave-requests",
    workspaceId,
    staffMemberId,
    "operational-plus-actionable",
    range.startDate,
    range.endDate,
  ] as const;
  const query = useQuery({
    queryKey,
    queryFn: () =>
      fetchPortalLeaveRequests(workspaceId!, staffMemberId!, range.startDate, range.endDate),
    enabled,
    staleTime: 15_000,
  });

  const isLive = enabled && query.isSuccess;
  const data = query.data ?? [];

  // Open-shift eligibility is date-specific in the staff member's venue zone.
  // A UTC date here can be one day ahead/behind and briefly expose a shift that
  // approved leave should exclude.
  const todayIso = timezone
    ? dateIsoInTimezone(new Date(), timezone)
    : new Date().toISOString().slice(0, 10);

  const approvedLeave = upcomingApprovedLeaveRequests(data, todayIso);
  const withdrawMutation = useMutation({
    mutationFn: async (leaveRequestId: string) => {
      const result = await cancelPortalLeaveRequestFn({
        data: { workspaceId: workspaceId!, leaveRequestId },
      });
      if (!result.ok) throw new Error(result.message);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["portal", "leave-requests", workspaceId, staffMemberId],
      });
      toast.success("Leave request withdrawn", {
        description:
          "Your manager has been notified. The cancelled request remains in your history.",
      });
    },
    onError: (error: Error) => toast.error("Request not withdrawn", { description: error.message }),
  });

  return {
    enabled,
    isLive,
    isLoading: query.isLoading && enabled,
    isError: query.isError && enabled,
    retry: () => void query.refetch(),
    isWithdrawing: withdrawMutation.isPending,
    withdraw: (leaveRequestId) => withdrawMutation.mutate(leaveRequestId),
    approvedLeave: isLive ? approvedLeave : [],
    requestHistory: isLive ? data : [],
  };
}
