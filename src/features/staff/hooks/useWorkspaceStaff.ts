import { useQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { rows as demoRows } from "../data/mockStaffData";
import { fetchWorkspaceStaffFn } from "../api/staffLiveData";
import type { StaffRow } from "../types";

const staffRouteApi = getRouteApi("/staff");

export type WorkspaceStaff = {
  rows: StaffRow[];
  /** Where the roster came from: the live workspace read or the demo seed. */
  source: "live" | "demo";
  isLoading: boolean;
  isError: boolean;
};

/**
 * The staff roster for the Staff page. Prefers a live, manager-scoped read when
 * Supabase is configured and the caller is an authenticated owner/manager;
 * falls back to the demo roster only when unconfigured, signed out, or the read
 * fails/loads — so Harbour View always renders. A successful live read with zero
 * rows is shown as an honest empty live roster, never the demo seed.
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

  // A successful live read is authoritative even when empty; the demo roster is
  // only a fallback for no env, no session, or a failed/in-flight read.
  const isLive = enabled && query.isSuccess;

  return {
    rows: isLive ? (query.data ?? []) : demoRows,
    source: isLive ? "live" : "demo",
    isLoading: enabled && query.isLoading,
    isError: enabled && query.isError,
  };
}
