import { useQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { rows as demoRows } from "../data/mockStaffData";
import { fetchWorkspaceStaffFn } from "../api/staffLiveData";
import { resolveStaffRosterState, type StaffRosterLoadState } from "../lib/staffRosterState";
import type { StaffRow } from "../types";

const staffRouteApi = getRouteApi("/staff");

export type WorkspaceStaff = {
  rows: StaffRow[];
  /** Where the roster came from: the live workspace read or the demo seed. */
  source: "live" | "demo";
  state: StaffRosterLoadState;
  isLoading: boolean;
  isError: boolean;
};

/**
 * The staff roster for the Staff page. Prefers a live, manager-scoped read when
 * Supabase is configured and the caller is an authenticated owner/manager;
 * uses the demo roster only when live data is intentionally unavailable. Once a
 * live workspace is resolved, loading and errors stay explicit and a successful
 * zero-row read remains authoritative.
 */
export function useWorkspaceStaff(): WorkspaceStaff {
  const { auth } = staffRouteApi.useRouteContext();

  const workspaceId = auth.status === "member" ? auth.workspaceId : null;
  const enabled =
    Boolean(getSupabaseEnv()) &&
    auth.status === "member" &&
    (auth.role === "owner" || auth.role === "manager");

  const query = useQuery({
    queryKey: ["staff", "workspace-roster", workspaceId],
    queryFn: () => fetchWorkspaceStaffFn(),
    enabled,
    staleTime: 30_000,
  });

  const resolved = resolveStaffRosterState({
    liveEnabled: enabled,
    isLoading: query.isLoading,
    isError: query.isError,
    liveRows: query.isSuccess ? query.data : undefined,
    demoRows,
  });

  return {
    ...resolved,
    isLoading: enabled && query.isLoading,
    isError: enabled && query.isError,
  };
}
