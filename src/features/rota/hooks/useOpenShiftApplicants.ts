import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { toast } from "sonner";
import { getSupabaseEnv } from "@/lib/supabase/env";
import {
  declineOpenShiftRequestFn,
  fetchOpenShiftApplicantsFn,
  selectOpenShiftApplicantFn,
  type OpenShiftApplicant,
} from "../api/openShiftApplicants";

const rotaRouteApi = getRouteApi("/rota");

export type OpenShiftApplicants = {
  enabled: boolean;
  isLoading: boolean;
  isError: boolean;
  /** Pending/selected applicants for the given draft shift, oldest first. */
  applicantsFor: (sourceShiftId: string) => OpenShiftApplicant[];
  busy: boolean;
  retry: () => void;
  select: (requestId: string) => void;
  decline: (requestId: string, reason?: string) => void;
};

/**
 * Manager review of open-shift applicants for one rota week. Selecting assigns
 * the DRAFT shift (the grid refreshes via the week query), never the published
 * snapshot — republishing finalises and notifies.
 */
export function useOpenShiftApplicants(rotaWeekId: string | null): OpenShiftApplicants {
  const { auth } = rotaRouteApi.useRouteContext();
  const queryClient = useQueryClient();
  const [busy, setBusy] = React.useState(false);

  const workspaceId = auth.status === "member" ? auth.workspaceId : null;
  const enabled =
    Boolean(getSupabaseEnv()) &&
    auth.status === "member" &&
    (auth.role === "owner" || auth.role === "manager") &&
    Boolean(rotaWeekId);

  const queryKey = ["rota", "open-shift-applicants", workspaceId, rotaWeekId];
  const query = useQuery({
    queryKey,
    queryFn: () => fetchOpenShiftApplicantsFn({ data: { rotaWeekId: rotaWeekId! } }),
    enabled,
    staleTime: 15_000,
  });

  const applicants = React.useMemo(() => query.data ?? [], [query.data]);
  const byShift = React.useMemo(() => {
    const map = new Map<string, OpenShiftApplicant[]>();
    for (const applicant of applicants) {
      const list = map.get(applicant.sourceShiftId) ?? [];
      list.push(applicant);
      map.set(applicant.sourceShiftId, list);
    }
    return map;
  }, [applicants]);

  const run = React.useCallback(
    async (
      label: string,
      success: { title: string; description: string },
      operation: () => Promise<{ ok: true } | { ok: false; message: string }>,
    ) => {
      setBusy(true);
      try {
        const result = await operation();
        if (!result.ok) {
          toast.error(label, { description: result.message });
          return;
        }
        // The decision changed the draft shift and the request list; refresh
        // both so the grid and the applicants section stay truthful.
        await Promise.all([
          queryClient.invalidateQueries({ queryKey }),
          queryClient.invalidateQueries({ queryKey: ["rota", "workspace-week", workspaceId] }),
        ]);
        toast.success(success.title, { description: success.description });
      } catch {
        toast.error(label, { description: "We couldn't apply that decision. Please try again." });
      } finally {
        setBusy(false);
      }
    },
    // Key parts, not array identity, drive when run must change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queryClient, workspaceId, rotaWeekId],
  );

  return {
    enabled,
    isLoading: enabled && query.isLoading,
    isError: enabled && query.isError,
    applicantsFor: (sourceShiftId: string) => byShift.get(sourceShiftId) ?? [],
    busy,
    retry: () => void query.refetch(),
    select: (requestId: string) => {
      void run(
        "Applicant not selected",
        {
          title: "Applicant selected",
          description:
            "The draft shift is assigned to them. Republish the rota to confirm it and notify staff.",
        },
        () => selectOpenShiftApplicantFn({ data: { requestId } }),
      );
    },
    decline: (requestId: string, reason?: string) => {
      void run(
        "Request not declined",
        { title: "Request declined", description: "The staff member has been notified." },
        () => declineOpenShiftRequestFn({ data: { requestId, ...(reason ? { reason } : {}) } }),
      );
    },
  };
}
