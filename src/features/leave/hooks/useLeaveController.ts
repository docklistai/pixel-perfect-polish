import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { toast } from "sonner";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { useWorkspaceSelector } from "@/features/demo/store/useWorkspaceStore";
import { decideLeaveRequestFn, fetchWorkspaceLeaveFn } from "../api/leaveLiveData";
import { resolveLeaveView, type LeaveViewState } from "../lib/leaveView";
import { useLeaveActions } from "./useLeaveActions";
import type { LeaveRequest, LeaveSource } from "../types";

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
  approve: (id: string, reason: string) => void;
  decline: (id: string, reason: string) => void;
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

  const queryKey = ["leave", "workspace-requests", workspaceId];
  const query = useQuery({
    queryKey,
    queryFn: () => fetchWorkspaceLeaveFn({ data: { workspaceId: workspaceId! } }),
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

  // Demo mode (signed out / Supabase unconfigured) keeps the demo store + actions.
  // Live loading and live error fall through to live state with no demo requests.
  if (view.source === "demo") {
    return { requests: view.requests, source: "demo", state: view.state, ...demo };
  }

  const decide = async (
    id: string,
    status: "approved" | "declined" | "pending",
    reason: string,
    successTitle: string,
    successDescription: string,
  ) => {
    args.onCloseDecision();
    const result = await decideLeaveRequestFn({
      data: { workspaceId: workspaceId!, leaveRequestId: id, status, reason: reason || undefined },
    });
    if (!result.ok) {
      toast.error("Couldn't update request", { description: result.message });
      return;
    }
    await queryClient.invalidateQueries({ queryKey });
    args.onSelectRequest(id);
    toast.success(successTitle, { description: successDescription });
  };

  return {
    requests: view.requests,
    source: "live",
    state: view.state,
    approve: (id, reason) =>
      void decide(
        id,
        "approved",
        reason,
        "Leave approved",
        "The request is approved and the team member was notified.",
      ),
    decline: (id, reason) =>
      void decide(
        id,
        "declined",
        reason,
        "Request declined",
        "The request is declined and the reason was saved to the record.",
      ),
    reopen: (id) =>
      void decide(id, "pending", "", "Reopened", "Request returned to the review queue."),
    // No manager-side leave-creation RPC: do not echo to the demo store or fake success.
    createRequest: () =>
      toast.info("Not available in live mode yet", {
        description: "Manager-created leave isn't wired to the live workspace yet.",
      }),
  };
}
