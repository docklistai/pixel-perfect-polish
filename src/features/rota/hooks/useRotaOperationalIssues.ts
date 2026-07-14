import { useQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { getSupabaseEnv } from "@/lib/supabase/env";
import {
  fetchRotaOperationalIssuesFn,
  type RotaOperationalIssue,
} from "../api/rotaOperationalIssues";

const rotaRouteApi = getRouteApi("/rota");
export const rotaOperationalIssuesPrefix = ["rota", "operational-issues"] as const;

export interface RotaOperationalIssuesState {
  enabled: boolean;
  isLoading: boolean;
  isError: boolean;
  issues: RotaOperationalIssue[];
  retry: () => void;
}

export function useRotaOperationalIssues(rotaWeekId: string | null): RotaOperationalIssuesState {
  const { auth } = rotaRouteApi.useRouteContext();
  const workspaceId = auth.status === "member" ? auth.workspaceId : null;
  const enabled =
    Boolean(getSupabaseEnv()) &&
    auth.status === "member" &&
    (auth.role === "owner" || auth.role === "manager") &&
    Boolean(rotaWeekId);
  const query = useQuery({
    queryKey: [...rotaOperationalIssuesPrefix, workspaceId, rotaWeekId],
    queryFn: () => fetchRotaOperationalIssuesFn({ data: { rotaWeekId: rotaWeekId! } }),
    enabled,
    staleTime: 15_000,
  });
  return {
    enabled,
    isLoading: enabled && query.isLoading,
    isError: enabled && query.isError,
    issues: query.data ?? [],
    retry: () => void query.refetch(),
  };
}
