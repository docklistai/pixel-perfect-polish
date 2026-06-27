import { useQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { Users, Calendar } from "lucide-react";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { fetchWorkspaceStaffFn } from "@/features/staff/api/staffLiveData";
import { fetchWorkspaceRotaWeekFn } from "@/features/rota/api/rotaLiveData";
import { fetchWorkspaceLeaveFn } from "@/features/leave/api/leaveLiveData";
import { fetchWorkspaceTimeFn } from "@/features/time/api/timeLiveData";
import { TIME_QUERY_KEY } from "@/features/time/hooks/useWorkspaceTime";
import { countOpenShifts, totalScheduledHours } from "@/features/rota/lib/rotaSummaries";
import { buildDashboardOperational } from "../lib/dashboardOperational";
import { formatDashboardPublishWeekLabel } from "../lib/nextPublishWeek";
import { useDashboardWorkspace } from "./useDashboardWorkspace";
import type { KpiItem } from "../types";

const dashRouteApi = getRouteApi("/");

/** Index of `todayIso` within the week starting `weekStartIso`, or null if outside it. */
function dayIndexInWeek(weekStartIso: string | null, todayIso: string | null): number | null {
  if (!weekStartIso || !todayIso) return null;
  const diff = Math.round((Date.parse(todayIso) - Date.parse(weekStartIso)) / 86_400_000);
  return diff >= 0 && diff <= 6 ? diff : null;
}

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
    queryKey: ["leave", "workspace-requests", workspaceId],
    queryFn: () => fetchWorkspaceLeaveFn({ data: { workspaceId: workspaceId! } }),
    enabled,
    staleTime: 15_000,
  });
  const timeQuery = useQuery({
    queryKey: ["time", TIME_QUERY_KEY, workspaceId],
    queryFn: () => fetchWorkspaceTimeFn({ data: { workspaceId: workspaceId! } }),
    enabled,
    staleTime: 15_000,
  });

  if (!enabled) {
    return {
      ...demo,
      publishWeekLabel: formatDashboardPublishWeekLabel(null),
      staffCount: null as number | null,
    };
  }

  const week = weekQuery.data ?? null;
  const shifts = week?.shifts ?? [];
  const openShifts = countOpenShifts(shifts);
  const staffCount = staffQuery.data?.length ?? 0;
  const pendingLeave = (leaveQuery.data ?? []).filter((request) => request.state === "pending");
  const pendingTime = (timeQuery.data ?? []).filter((row) => row.status !== "approved");

  const { leaveItems, timesheetItems, attentionItems } = buildDashboardOperational({
    openShifts,
    pendingLeave,
    pendingTime,
    timesheetPeriodLabel: "Awaiting review",
  });

  const todayIndex = dayIndexInWeek(week?.weekStart ?? null, week?.today ?? null);
  const onShiftToday =
    todayIndex === null
      ? 0
      : shifts.filter((shift) => shift.dayIndex === todayIndex && shift.staffId !== null).length;

  // Live KPIs are derived from live reads only. Coverage needs role-requirement
  // data that has no live source yet, so it is replaced with the live team size
  // rather than shown as a fabricated percentage.
  const weeklyKpis: KpiItem[] = [
    {
      icon: Users,
      label: "Scheduled hours",
      value: `${Math.round(totalScheduledHours(shifts))}h`,
      delta: "This week · live",
      up: true,
      tone: "info",
      tip: "Total scheduled hours this week, from your live rota.",
    },
    {
      icon: Users,
      label: "Team size",
      value: String(staffCount),
      delta: "Live roster",
      up: true,
      tone: "brand",
      tip: "Staff members in your workspace roster.",
    },
  ];
  const todayKpis: KpiItem[] = [
    {
      icon: Calendar,
      label: "On shift today",
      value: String(onShiftToday),
      delta: "Live",
      up: true,
      tone: "info",
      tip: "Assigned shifts on today's live rota.",
    },
  ];

  return {
    source: "live" as const,
    openShifts,
    pendingTime,
    pendingLeave,
    leaveItems,
    timesheetItems,
    attentionItems,
    weeklyKpis,
    todayKpis,
    nextPublished: Boolean(week?.hasPublishedSnapshot),
    nextHasUnpublishedChanges: Boolean(week?.hasUnpublishedChanges),
    publishWeekLabel: formatDashboardPublishWeekLabel(week?.weekStart),
    staffCount,
  };
}
