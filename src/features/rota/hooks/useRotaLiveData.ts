import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { fetchWorkspaceStaffFn } from "@/features/staff/api/staffLiveData";
import { getAssignableStaffRows } from "../lib/assignableStaff";
import { toRotaStaffMember } from "../lib/rotaLiveStaff";
import {
  fetchWorkspaceRotaWeekFn,
  type LiveRotaLocation,
  type LiveWeekStatus,
} from "../api/rotaLiveData";
import type { DraftShift, StaffMember } from "../types";
import { fetchRotaLeaveFn } from "@/features/leave/api/leaveLiveData";
import { leaveQueryKeys, rotaLeaveRange } from "@/features/leave/lib/leaveQueryRange";
import type { LeaveRequest } from "@/features/leave/types";

const rotaRouteApi = getRouteApi("/rota");

export type RotaLiveData = {
  workspaceId: string | null;
  enabled: boolean;
  isLive: boolean;
  source: "live" | "demo";
  isLoading: boolean;
  isError: boolean;
  isLeaveLoading: boolean;
  isLeaveError: boolean;
  hasWeek: boolean;
  rotaWeekId: string | null;
  weekStatus: LiveWeekStatus | null;
  hasPublishedSnapshot: boolean;
  hasUnpublishedChanges: boolean;
  weekStart: string | null;
  locationId: string | null;
  locationName: string | null;
  locations: LiveRotaLocation[];
  today: string | null;
  setLocationId: (locationId: string) => void;
  refetchWeek: () => Promise<void>;
  staff: StaffMember[];
  assignableStaff: StaffMember[];
  shifts: DraftShift[];
  leaveRequests: LeaveRequest[];
};

const DEMO: RotaLiveData = {
  workspaceId: null,
  enabled: false,
  isLive: false,
  source: "demo",
  isLoading: false,
  isError: false,
  isLeaveLoading: false,
  isLeaveError: false,
  hasWeek: false,
  rotaWeekId: null,
  weekStatus: null,
  hasPublishedSnapshot: false,
  hasUnpublishedChanges: false,
  weekStart: null,
  locationId: null,
  locationName: null,
  locations: [],
  today: null,
  setLocationId: () => undefined,
  refetchWeek: async () => undefined,
  staff: [],
  assignableStaff: [],
  shifts: [],
  leaveRequests: [],
};

/** Manager-scoped live rota source, aligned with the route location selection. */
export function useRotaLiveData(
  weekOffset: number,
  initialLocationId: string | null = null,
): RotaLiveData {
  const { auth } = rotaRouteApi.useRouteContext();
  const [selectedLocationId, setSelectedLocationId] = React.useState<string | null>(
    initialLocationId,
  );
  const routeLocationRef = React.useRef(initialLocationId);
  const workspaceId = auth.status === "member" ? auth.workspaceId : null;
  const enabled =
    Boolean(getSupabaseEnv()) &&
    auth.status === "member" &&
    (auth.role === "owner" || auth.role === "manager");

  const staffQuery = useQuery({
    queryKey: ["staff", "workspace-roster", workspaceId],
    queryFn: () => fetchWorkspaceStaffFn(),
    enabled,
    staleTime: 30_000,
  });

  const weekQuery = useQuery({
    queryKey: ["rota", "workspace-week", workspaceId, weekOffset, selectedLocationId],
    queryFn: () =>
      fetchWorkspaceRotaWeekFn({
        data: {
          weekOffset,
          ...(selectedLocationId ? { locationId: selectedLocationId } : {}),
        },
      }),
    enabled,
    staleTime: 15_000,
  });

  const leaveRange = weekQuery.data?.weekStart ? rotaLeaveRange(weekQuery.data.weekStart) : null;
  const leaveQuery = useQuery({
    queryKey: leaveRange
      ? leaveQueryKeys.rota(workspaceId, leaveRange)
      : ["leave", workspaceId, "rota-overlap", "awaiting-week"],
    queryFn: () => fetchRotaLeaveFn({ data: { workspaceId: workspaceId!, ...leaveRange! } }),
    enabled: enabled && leaveRange !== null,
    staleTime: 15_000,
  });

  const isLive = enabled && staffQuery.isSuccess && weekQuery.isSuccess;

  React.useEffect(() => {
    if (routeLocationRef.current === initialLocationId) return;
    routeLocationRef.current = initialLocationId;
    setSelectedLocationId(initialLocationId);
  }, [initialLocationId]);

  React.useEffect(() => {
    if (weekQuery.isSuccess && weekQuery.data.locationId !== selectedLocationId) {
      setSelectedLocationId(weekQuery.data.locationId);
    }
  }, [selectedLocationId, weekQuery.data, weekQuery.isSuccess]);

  const refetchWeek = React.useCallback(async () => {
    await weekQuery.refetch();
  }, [weekQuery]);

  if (!isLive) {
    return {
      ...DEMO,
      workspaceId,
      enabled,
      setLocationId: setSelectedLocationId,
      refetchWeek,
      isLoading: enabled && (staffQuery.isLoading || weekQuery.isLoading),
      isError: enabled && (staffQuery.isError || weekQuery.isError),
      isLeaveLoading: enabled && leaveQuery.isLoading,
      isLeaveError: enabled && leaveQuery.isError,
    };
  }

  return {
    workspaceId,
    enabled: true,
    isLive: true,
    source: "live",
    isLoading: false,
    isError: false,
    isLeaveLoading: leaveQuery.isLoading,
    isLeaveError: leaveQuery.isError,
    hasWeek: weekQuery.data.hasWeek,
    rotaWeekId: weekQuery.data.rotaWeekId,
    weekStatus: weekQuery.data.status,
    hasPublishedSnapshot: weekQuery.data.hasPublishedSnapshot,
    hasUnpublishedChanges: weekQuery.data.hasUnpublishedChanges,
    weekStart: weekQuery.data.weekStart,
    locationId: weekQuery.data.locationId,
    locationName: weekQuery.data.locationName,
    locations: weekQuery.data.locations,
    today: weekQuery.data.today,
    setLocationId: setSelectedLocationId,
    refetchWeek,
    staff: (staffQuery.data ?? []).map(toRotaStaffMember),
    assignableStaff: getAssignableStaffRows(staffQuery.data ?? []).map(toRotaStaffMember),
    shifts: weekQuery.data.shifts,
    leaveRequests: leaveQuery.data ?? [],
  };
}
