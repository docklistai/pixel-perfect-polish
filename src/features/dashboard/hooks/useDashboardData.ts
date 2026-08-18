import { useQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { fetchWorkspaceStaffFn } from "@/features/staff/api/staffLiveData";
import { fetchWorkspaceRotaWeekFn } from "@/features/rota/api/rotaLiveData";
import { fetchPendingLeavePreviewFn } from "@/features/leave/api/leaveLiveData";
import { leaveQueryKeys } from "@/features/leave/lib/leaveQueryRange";
import { fetchPendingTimePreviewFn } from "@/features/time/api/timeOperationalReads";
import { timeQueryKeys } from "@/features/time/lib/timeQueryRange";
import { countOpenShifts } from "@/features/rota/lib/rotaSummaries";
import { buildDashboardOperational } from "../lib/dashboardOperational";
import { buildLiveKpis, countAssignedToday, dayIndexInWeek } from "../lib/dashboardKpis";
import { formatDashboardPublishWeekLabel } from "../lib/nextPublishWeek";
import { useDashboardWorkspace } from "./useDashboardWorkspace";
import type { DraftShift } from "@/features/rota/types";

const dashRouteApi = getRouteApi("/");
const PENDING_LEAVE_PREVIEW_LIMIT = 5;
const PENDING_TIME_PREVIEW_LIMIT = 5;

/**
 * Dashboard operational data, live-first. In a live manager workspace the core
 * numbers (open shifts, pending leave, pending/unapproved time, rota publish
 * state, staff count, scheduled hours) come from the same server functions the
 * /rota, /leave, /time and /staff pages use — so the home screen can never
 * present demo figures as real. While the live reads load or error, the numbers
 * fall through to honest zeros rather than blending in the demo store. When
 * Supabase is unconfigured or the caller is signed out, the demo store drives
 * the dashboard so Harbour View keeps working offline.
 */
export function useDashboardData() {
  const demo = useDashboardWorkspace();
  const { auth } = dashRouteApi.useRouteContext();

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
    queryKey: ["rota", "workspace-week", workspaceId, 0, null],
    queryFn: () => fetchWorkspaceRotaWeekFn({ data: { weekOffset: 0 } }),
    enabled,
    staleTime: 15_000,
  });
  const leaveQuery = useQuery({
    queryKey: leaveQueryKeys.pendingPreview(workspaceId, PENDING_LEAVE_PREVIEW_LIMIT),
    queryFn: () =>
      fetchPendingLeavePreviewFn({
        data: { workspaceId: workspaceId!, limit: PENDING_LEAVE_PREVIEW_LIMIT },
      }),
    enabled,
    staleTime: 15_000,
  });
  const timeQuery = useQuery({
    queryKey: timeQueryKeys.pendingPreview(workspaceId, PENDING_TIME_PREVIEW_LIMIT),
    queryFn: () =>
      fetchPendingTimePreviewFn({
        data: { workspaceId: workspaceId!, limit: PENDING_TIME_PREVIEW_LIMIT },
      }),
    enabled,
    staleTime: 15_000,
  });

  if (!enabled) {
    return {
      ...demo,
      isLiveLoading: false,
      isLiveError: false,
      retryLive: () => undefined,
      publishWeekLabel: formatDashboardPublishWeekLabel(null),
      staffCount: null as number | null,
      weekShifts: [] as DraftShift[],
      pendingLeaveCount: demo.pendingLeave.length,
      pendingTimeCount: demo.pendingTime.length,
    };
  }

  // The setup panel must never flash while live reads resolve, so it only
  // renders once the roster and week reads have both succeeded.
  const liveReady = staffQuery.isSuccess && weekQuery.isSuccess;

  // The home screen must not show zeros or "all clear" while any required
  // read is still settling, and a failed read gets an explicit error + retry
  // surface instead of quietly rendering empty-looking data.
  const isLiveLoading =
    staffQuery.isLoading || weekQuery.isLoading || leaveQuery.isLoading || timeQuery.isLoading;
  const isLiveError =
    staffQuery.isError || weekQuery.isError || leaveQuery.isError || timeQuery.isError;
  const retryLive = () => {
    void staffQuery.refetch();
    void weekQuery.refetch();
    void leaveQuery.refetch();
    void timeQuery.refetch();
  };

  const week = weekQuery.data ?? null;
  const shifts = week?.shifts ?? [];
  const openShifts = countOpenShifts(shifts);
  const staffCount = staffQuery.data?.length ?? 0;
  const pendingLeave = leaveQuery.data?.requests ?? [];
  const pendingLeaveCount = leaveQuery.data?.total ?? 0;
  const pendingTime = timeQuery.data?.rows ?? [];
  const pendingTimeCount = timeQuery.data?.total ?? 0;

  const { leaveItems, timesheetItems, attentionItems } = buildDashboardOperational({
    openShifts,
    // Live reads watch the current rota week (weekOffset 0), so copy says "this week".
    weekScope: "current",
    pendingLeave,
    pendingLeaveCount,
    pendingTime,
    pendingTimeCount,
    timesheetPeriodLabel: "Awaiting review",
  });

  const todayIndex = dayIndexInWeek(week?.weekStart ?? null, week?.today ?? null);
  const onShiftToday = countAssignedToday(shifts, todayIndex);
  const { weeklyKpis, todayKpis } = buildLiveKpis({ shifts, staffCount, onShiftToday });

  return {
    source: "live" as const,
    liveReady,
    isLiveLoading,
    isLiveError,
    retryLive,
    openShifts,
    plannedShiftCount: shifts.length,
    pendingTime,
    pendingTimeCount,
    pendingLeave,
    pendingLeaveCount,
    leaveItems,
    timesheetItems,
    attentionItems,
    weeklyKpis,
    todayKpis,
    nextPublished: Boolean(week?.hasPublishedSnapshot),
    nextHasUnpublishedChanges: Boolean(week?.hasUnpublishedChanges),
    publishWeekLabel: formatDashboardPublishWeekLabel(week?.weekStart),
    attentionWeekScope: "current" as const,
    staffCount,
    weekShifts: shifts,
  };
}
