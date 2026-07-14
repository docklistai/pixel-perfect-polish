import type { LeaveRequest, LeaveRequestState } from "@/features/leave/types";
import type { PortalNotification } from "@/features/staff-portal/types";
import type { MockNotification } from "@/components/notificationData";
import { DEMO_WORLD } from "@/features/demo/data/demoWorld";
import type { WorkspaceStore } from "./createWorkspaceStore";

const PORTAL_STAFF_ID = "olivia-bennett";

function decisionNotification(
  request: LeaveRequest,
  state: "approved" | "declined" | "cancelled",
  reason: string,
): PortalNotification {
  const cancelled = state === "cancelled";
  return {
    id: `nt-leave-${request.id}-${state}-${Date.now()}`,
    kind:
      state === "approved" ? "leave-approved" : cancelled ? "leave-cancelled" : "leave-declined",
    title:
      state === "approved"
        ? "Leave approved"
        : cancelled
          ? "Approved leave cancelled"
          : "Leave request declined",
    body:
      state === "approved"
        ? `Your ${request.type.toLowerCase()} request for ${request.date} has been approved.`
        : cancelled
          ? `Your approved ${request.type.toLowerCase()} for ${request.date} was cancelled by a manager: ${reason}`
          : `Your ${request.type.toLowerCase()} request for ${request.date} was declined: ${reason}`,
    postedAt: `Today, ${DEMO_WORLD.nowLabel}`,
    badge:
      state === "approved"
        ? { tone: "success", label: "Approved" }
        : cancelled
          ? { tone: "warning", label: "Cancelled" }
          : { tone: "danger", label: "Declined" },
    unread: true,
    important: true,
    relatedLeaveRequestId: request.id,
  };
}

/**
 * Approves / declines / reopens a leave request. If the request belongs to
 * the portal staff member, the decision also notifies their staff app.
 */
export function setLeaveRequestState(
  store: WorkspaceStore,
  id: string,
  state: LeaveRequestState,
  reason: string,
): void {
  store.setState((current) => {
    const request = current.leaveRequests.find((item) => item.id === id);
    if (!request || request.state === state) return current;
    const leaveRequests = current.leaveRequests.map((item) =>
      item.id === id
        ? {
            ...item,
            state,
            cancellationSource: state === "cancelled" ? "manager" : item.cancellationSource,
            decisionHistory: [
              ...(item.decisionHistory ?? []),
              { state, reason, at: `Today, ${DEMO_WORLD.nowLabel} (Europe/London)` },
            ],
          }
        : item,
    );
    const notify =
      request.staffId === PORTAL_STAFF_ID &&
      (state === "approved" || state === "declined" || state === "cancelled");
    const withoutPriorDecision = current.portalNotifications.filter(
      (notification) => notification.relatedLeaveRequestId !== request.id,
    );
    return {
      ...current,
      leaveRequests,
      portalNotifications: notify
        ? [decisionNotification(request, state, reason), ...withoutPriorDecision]
        : withoutPriorDecision,
    };
  });
}

/**
 * Adds a leave request to the review queue. Callers that should alert the
 * manager inbox (e.g. portal submissions) pass a prebuilt notification —
 * icon choice stays in the UI layer.
 */
export function createLeaveRequest(
  store: WorkspaceStore,
  request: LeaveRequest,
  managerNotification?: MockNotification,
): void {
  store.setState((current) => ({
    ...current,
    leaveRequests: [request, ...current.leaveRequests],
    managerNotifications: managerNotification
      ? [managerNotification, ...current.managerNotifications]
      : current.managerNotifications,
  }));
}
