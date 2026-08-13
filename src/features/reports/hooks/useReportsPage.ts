import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { fetchReportsPageFn } from "../api/reportsRead";
import { addIsoDays } from "@/features/rota/lib/liveRotaDates";
import type { ReportsPeriodPreset } from "../types";

const routeApi = getRouteApi("/reports");

export function useReportsPage() {
  const { auth } = routeApi.useRouteContext();
  const workspaceId = auth.status === "member" ? auth.workspaceId : null;
  const enabled = Boolean(getSupabaseEnv()) && workspaceId !== null;
  const [periodPreset, setPreset] = React.useState<ReportsPeriodPreset>("four_weeks");
  const [period, setPeriod] = React.useState<{ start: string; end: string } | null>(null);
  const [locationId, setLocationId] = React.useState<string | null>(null);
  const [departmentId, setDepartmentId] = React.useState<string | null>(null);

  const query = useQuery({
    queryKey: ["reports", workspaceId, periodPreset, period, locationId, departmentId],
    queryFn: () =>
      fetchReportsPageFn({
        data: {
          periodStart: period?.start ?? null,
          periodEnd: period?.end ?? null,
          locationId,
          departmentId,
        },
      }),
    enabled,
    staleTime: 10_000,
  });

  const setPeriodPreset = (preset: ReportsPeriodPreset) => {
    if (preset === "four_weeks") {
      setPreset(preset);
      setPeriod(null);
      return;
    }
    const currentWeekStart = query.data?.meta.currentWeekStart;
    if (!currentWeekStart) return;
    setPreset(preset);
    setPeriod({ start: currentWeekStart, end: addIsoDays(currentWeekStart, 6) });
  };

  return {
    enabled,
    query,
    data: query.data ?? null,
    isLoading: enabled && query.isPending,
    isError: !enabled || query.isError,
    periodPreset,
    setPeriodPreset,
    locationId,
    setLocationId,
    departmentId,
    setDepartmentId,
  };
}
