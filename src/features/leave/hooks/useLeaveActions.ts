import { toast } from "sonner";
import { useWorkspaceStore } from "@/features/demo/store/useWorkspaceStore";
import { createLeaveRequest, setLeaveRequestState } from "@/features/demo/store/leaveActions";
import type { LeaveRequest } from "../types";

/**
 * Manager-side leave decisions for the Leave page. Wraps the workspace store
 * actions with the decision toasts (approve/decline/undo) so the route only
 * orchestrates layout and overlay state.
 */
export function useLeaveActions({
  decisionRequest,
  onSelectRequest,
  onCloseDecision,
  onCloseNewRequest,
}: {
  decisionRequest: LeaveRequest | null;
  onSelectRequest: (id: string) => void;
  onCloseDecision: () => void;
  onCloseNewRequest: () => void;
}) {
  const store = useWorkspaceStore();

  const updateState = (id: string, state: LeaveRequest["state"], reason: string) => {
    setLeaveRequestState(store, id, state, reason);
    onSelectRequest(id);
  };

  const approve = (id: string, reason: string) => {
    updateState(id, "approved", reason);
    onCloseDecision();
    toast.success("Leave approved", {
      description: `${decisionRequest?.n ?? "The team member"}'s request is approved and rota checks were updated.`,
      action: {
        label: "Undo",
        onClick: () => {
          updateState(id, "pending", "Approval undone by manager.");
          toast.info("Reverted", { description: "Request returned to pending." });
        },
      },
    });
  };

  const decline = (id: string, reason: string) => {
    updateState(id, "declined", reason);
    onCloseDecision();
    toast.warning("Request declined", {
      description: `${decisionRequest?.n ?? "The team member"}'s request is declined and the reason is saved to the record.`,
      action: {
        label: "Undo",
        onClick: () => {
          updateState(id, "pending", "Decline decision undone by manager.");
          toast.info("Reverted", { description: "Request returned to pending review." });
        },
      },
    });
  };

  const reopen = (id: string) => {
    updateState(id, "pending", "Reopened for manager review.");
    toast.info("Reopened", { description: "Request returned to review queue" });
  };

  const createRequest = (request: LeaveRequest) => {
    createLeaveRequest(store, request);
    onSelectRequest(request.id);
    onCloseNewRequest();
    toast.success("Request created", {
      description: "Added to the pending review queue",
    });
  };

  return { approve, decline, reopen, createRequest };
}
