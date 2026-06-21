import { useQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { useWorkspaceSelector } from "@/features/demo/store/useWorkspaceStore";
import { fetchWorkspaceTimeFn } from "../api/timeLiveData";
import { resolveTimeView, type TimeViewState } from "../lib/timeView";
import type { StoredTimesheetRow } from "../types";

const timeRouteApi = getRouteApi("/time");

export const TIME_QUERY_KEY = "workspace-entries";

export type WorkspaceTime = {
  rows: StoredTimesheetRow[];
  /** Where the timesheets came from: the live workspace read or the demo store. */
  source: "live" | "demo";
  isLoading: boolean;
  isError: boolean;
  /** Honest render state — drives loading/error/empty surfaces, never demo blending. */
  state: TimeViewState;
};

/**
 * The timesheet rows for the Time page. Prefers a live, manager-scoped read of
 * `time_entries` when authenticated; falls back to the demo store when Supabase
 * is unconfigured, the caller is signed out, or the read fails, so Harbour View
 * keeps working offline.
 */
export function useWorkspaceTime(): WorkspaceTime {
  const { auth } = timeRouteApi.useRouteContext();
  const demoRows = useWorkspaceSelector((state) => state.timeRows);

  const workspaceId = auth.status === "member" ? auth.workspaceId : null;
  const enabled =
    Boolean(getSupabaseEnv()) &&
    auth.status === "member" &&
    (auth.role === "owner" || auth.role === "manager");

  const query = useQuery({
    queryKey: ["time", TIME_QUERY_KEY, workspaceId],
    queryFn: () => fetchWorkspaceTimeFn({ data: { workspaceId: workspaceId! } }),
    enabled,
    staleTime: 15_000,
  });

  return resolveTimeView({
    enabled,
    isSuccess: query.isSuccess,
    isLoading: query.isLoading,
    isError: query.isError,
    liveRows: query.data,
    demoRows,
  });
}
