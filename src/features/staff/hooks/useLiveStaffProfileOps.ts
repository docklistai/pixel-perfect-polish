import { useQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { fetchWorkspaceRotaWeekFn } from "@/features/rota/api/rotaLiveData";
import { fetchWorkspaceLeaveFn } from "@/features/leave/api/leaveLiveData";
import { fetchWorkspaceTimeFn } from "@/features/time/api/timeLiveData";
import type { LeaveRequest } from "@/features/leave/types";
import type { StoredTimesheetRow } from "@/features/time/types";
import {
  memberLeaveRequests,
  memberLeaveSummary,
  memberRecentTimeRows,
  memberUpcomingShifts,
  type MemberLeaveSummary,
  type MemberUpcomingShift,
} from "../lib/profileOperational";

const staffProfileRouteApi = getRouteApi("/staff/$staffId");

/** Lookahead is bounded to the current week + next week to keep the read cheap. */
const ROTA_WEEK_OFFSETS = [0, 1] as const;
const MAX_OVERVIEW_SHIFTS = 3;
const MAX_SCHEDULE_SHIFTS = 14;
const MAX_TIME_ROWS = 10;

export interface LiveStaffProfileOps {
  enabled: boolean;
  isShiftsLoading: boolean;
  isShiftsError: boolean;
  isLeaveLoading: boolean;
  isLeaveError: boolean;
  isTimeLoading: boolean;
  isTimeError: boolean;
  /** True when more than one active location exists, so shifts are one-location only. */
  multiLocation: boolean;
  locationName: string | null;
  overviewShifts: MemberUpcomingShift[];
  scheduleShifts: MemberUpcomingShift[];
  leaveSummary: MemberLeaveSummary;
  leaveRequests: LeaveRequest[];
  timeRows: StoredTimesheetRow[];
}

const EMPTY_LEAVE_SUMMARY: MemberLeaveSummary = {
  total: 0,
  pendingCount: 0,
  nextUpcoming: null,
};

/**
 * Manager-side, read-only operational context for one live staff profile.
 * Reuses the existing workspace-scoped rota and leave reads, then derives the
 * member's own upcoming shifts and leave through pure helpers. Demo profiles
 * never call this; it is gated on an authenticated owner/manager session.
 */
export function useLiveStaffProfileOps(staffId: string): LiveStaffProfileOps {
  const { auth } = staffProfileRouteApi.useRouteContext();
  const workspaceId = auth.status === "member" ? auth.workspaceId : null;
  const enabled =
    Boolean(getSupabaseEnv()) &&
    auth.status === "member" &&
    (auth.role === "owner" || auth.role === "manager");

  const rotaQuery = useQuery({
    queryKey: ["staff", "profile-rota", workspaceId],
    queryFn: async () => {
      const weeks = await Promise.all(
        ROTA_WEEK_OFFSETS.map((weekOffset) => fetchWorkspaceRotaWeekFn({ data: { weekOffset } })),
      );
      return weeks.map((week, index) => ({ weekOffset: ROTA_WEEK_OFFSETS[index]!, ...week }));
    },
    enabled,
    staleTime: 15_000,
  });

  const leaveQuery = useQuery({
    queryKey: ["leave", "workspace-requests", workspaceId],
    queryFn: () => fetchWorkspaceLeaveFn({ data: { workspaceId: workspaceId! } }),
    enabled,
    staleTime: 15_000,
  });

  const timeQuery = useQuery({
    queryKey: ["time", "workspace-entries", workspaceId],
    queryFn: () => fetchWorkspaceTimeFn({ data: { workspaceId: workspaceId! } }),
    enabled,
    staleTime: 15_000,
  });

  const weeks = rotaQuery.data ?? [];
  const todayIso = weeks[0]?.today ?? new Date().toISOString().slice(0, 10);
  const weekInputs = weeks.map((week) => ({
    weekOffset: week.weekOffset,
    weekStart: week.weekStart,
    shifts: week.shifts,
  }));
  const scheduleShifts = memberUpcomingShifts(weekInputs, staffId, todayIso, MAX_SCHEDULE_SHIFTS);

  const allLeave = leaveQuery.data ?? [];
  const allTime = timeQuery.data?.rows ?? [];

  return {
    enabled,
    isShiftsLoading: enabled && rotaQuery.isLoading,
    isShiftsError: enabled && rotaQuery.isError,
    isLeaveLoading: enabled && leaveQuery.isLoading,
    isLeaveError: enabled && leaveQuery.isError,
    isTimeLoading: enabled && timeQuery.isLoading,
    isTimeError: enabled && timeQuery.isError,
    multiLocation: (weeks[0]?.locations.length ?? 0) > 1,
    locationName: weeks[0]?.locationName ?? null,
    overviewShifts: scheduleShifts.slice(0, MAX_OVERVIEW_SHIFTS),
    scheduleShifts,
    leaveSummary: enabled ? memberLeaveSummary(allLeave, staffId, todayIso) : EMPTY_LEAVE_SUMMARY,
    leaveRequests: enabled ? memberLeaveRequests(allLeave, staffId) : [],
    timeRows: enabled ? memberRecentTimeRows(allTime, staffId, MAX_TIME_ROWS) : [],
  };
}
