import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { toast } from "sonner";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { useWorkspaceSelector } from "@/features/demo/store/useWorkspaceStore";
import { decideLeaveRequestFn, fetchWorkspaceLeaveFn } from "../api/leaveLiveData";
import { resolveLeaveView, type LeaveViewState } from "../lib/leaveView";
import { useLeaveActions } from "./useLeaveActions";
import type { LeaveRequest, LeaveSource } from "../types";
import { leaveQueryKeys, operationalLeaveRange } from "../lib/leaveQueryRange";

const leaveRouteApi = getRouteApi("/leave");

type ControllerArgs = {
  decisionRequest: LeaveRequest | null;
  onSelectRequest: (id: string) => void;
  onCloseDecision: () => void;
  onCloseNewRequest: () => void;
};

export type LeaveController = {
  requests: LeaveRequest[];
  /** Where the inbox came from: the live workspace read or the demo store. */
  source: LeaveSource;
  /** Honest render state — drives loading/error/empty surfaces, never demo blending. */
  state: LeaveViewState;
  decisionPending: boolean;
  approve: (id: string, reason: string) => void;
  decline: (id: string, reason: string) => void;
  cancel: (id: string, reason: string) => void;
  reopen: (id: string) => void;
  createRequest: (request: LeaveRequest) => void;
};

/**
 * Leave inbox + decisions for the Leave page. Prefers a live, manager-scoped
 * read and routes approve/decline/reopen through `rpc_decide_leave_request`
 * when authenticated; otherwise drives the demo WorkspaceStore so Harbour View
 * keeps working offline. There is no manager-side leave-creation RPC (only
 * staff submission), so in live mode manager-create is surfaced as "not
 * available yet" rather than echoing to the unused demo store with a false
 * "Request created" success.
 */
export function useLeaveController(args: ControllerArgs): LeaveController {
  const { auth } = leaveRouteApi.useRouteContext();
  const queryClient = useQueryClient();
  const demo = useLeaveActions(args);
  const demoRequests = useWorkspaceSelector((state) => state.leaveRequests);

  const workspaceId = auth.status === "member" ? auth.workspaceId : null;
  const enabled =
    Boolean(getSupabaseEnv()) &&
    auth.status === "member" &&
    (auth.role === "owner" || auth.role === "manager");

  const range = React.useMemo(() => operationalLeaveRange(), []);
  const queryKey = leaveQueryKeys.operational(workspaceId, range);
  const query = useQuery({
    queryKey,
    queryFn: () => fetchWorkspaceLeaveFn({ data: { workspaceId: workspaceId!, ...range } }),
    enabled,
    staleTime: 15_000,
  });

  const view = resolveLeaveView({
    enabled,
    isSuccess: query.isSuccess,
    isLoading: query.isLoading,
    isError: query.isError,
    liveRequests: query.data,
    demoRequests,
  });

  const decisionMutation = useMutation({
    mutationFn: async ({
      id,
      status,
      reason,
    }: {
      id: string;
      status: "approved" | "declined" | "pending" | "cancelled";
      reason: string;
      successTitle: string;
      successDescription: string;
    }) => {
      const result = await decideLeaveRequestFn({
        data: {
          workspaceId: workspaceId!,
          leaveRequestId: id,
          status,
          reason: reason || undefined,
        },
      });
      if (!result.ok) throw new Error(result.message);
    },
    onSuccess: async (_result, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: leaveQueryKeys.all(workspaceId) }),
        queryClient.invalidateQueries({ queryKey: ["manager-notifications", workspaceId] }),
        queryClient.invalidateQueries({ queryKey: ["rota", "workspace-week", workspaceId] }),
        queryClient.invalidateQueries({ queryKey: ["rota", "operational-issues"] }),
      ]);
      args.onSelectRequest(variables.id);
      args.onCloseDecision();
      toast.success(variables.successTitle, { description: variables.successDescription });
    },
    onError: (error: Error) => {
      toast.error("Couldn't update request", { description: error.message });
    },
  });

  // Demo mode (signed out / Supabase unconfigured) keeps the demo store + actions.
  // Live loading and live error fall through to live state with no demo requests.
  if (view.source === "demo") {
    return {
      requests: view.requests,
      source: "demo",
      state: view.state,
      decisionPending: false,
      ...demo,
    };
  }

  const decide = (
    id: string,
    status: "approved" | "declined" | "pending" | "cancelled",
    reason: string,
    successTitle: string,
    successDescription: string,
  ) => decisionMutation.mutate({ id, status, reason, successTitle, successDescription });

  return {
    requests: view.requests,
    source: "live",
    state: view.state,
    decisionPending: decisionMutation.isPending,
    approve: (id, reason) =>
      decide(
        id,
        "approved",
        reason,
        "Leave approved",
        "The request is approved and the team member was notified.",
      ),
    decline: (id, reason) =>
      decide(
        id,
        "declined",
        reason,
        "Request declined",
        "The request is declined and the reason was saved to the record.",
      ),
    cancel: (id, reason) =>
      decide(
        id,
        "cancelled",
        reason,
        "Approved leave cancelled",
        "The reason was saved, the team member was notified, and any published-week inconsistency was flagged.",
      ),
    reopen: (id) => decide(id, "pending", "", "Reopened", "Request returned to the review queue."),
    // No manager-side leave-creation RPC: do not echo to the demo store or fake success.
    createRequest: () =>
      toast.info("Not available in live mode yet", {
        description: "Manager-created leave isn't wired to the live workspace yet.",
      }),
  };
}
