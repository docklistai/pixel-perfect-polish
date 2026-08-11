import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { fetchTeamPageFn } from "../api/teamRead";
import { EMPTY_TEAM_PAGE } from "../lib/teamPresentation";
import type { TeamAnnouncement, TeamPageData } from "../types";
import { teamQueryKey, useTeamActions } from "./useTeamActions";

const routeApi = getRouteApi("/team");

export function useTeamPage() {
  const { auth } = routeApi.useRouteContext();
  const workspaceId = auth.status === "member" ? auth.workspaceId : null;
  const enabled = Boolean(getSupabaseEnv()) && workspaceId !== null;
  const actions = useTeamActions(workspaceId);

  const query = useQuery({
    queryKey: teamQueryKey(workspaceId),
    queryFn: () => fetchTeamPageFn(),
    enabled,
    staleTime: 10_000,
  });

  // There is deliberately no fixture fallback: an unresolved or failed live
  // read renders empty and the route shows an honest loading or error state.
  const data: TeamPageData = query.data ?? EMPTY_TEAM_PAGE;

  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const selected: TeamAnnouncement | null = React.useMemo(
    () => data.announcements.find((announcement) => announcement.id === selectedId) ?? null,
    [data.announcements, selectedId],
  );

  return {
    workspaceId,
    enabled,
    query,
    data,
    isLoading: enabled && query.isPending,
    isError: enabled && query.isError,
    selected,
    selectedId,
    setSelectedId,
    actions,
  };
}
