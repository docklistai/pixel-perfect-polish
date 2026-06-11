import type { LeaveRequest } from "@/features/leave/types";
import type { PortalNotification } from "@/features/staff-portal/types";
import type { MockNotification } from "@/components/notificationData";
import { DEMO_WORLD } from "@/features/demo/data/demoWorld";
import type { WorkspaceStore } from "./createWorkspaceStore";

const PORTAL_STAFF_ID = "olivia-bennett";

function decisionNotification(
  request: LeaveRequest,
  state: "approved" | "declined",
  reason: string,
): PortalNotification {
  return {
    id: `nt-leave-${request.id}-${state}-${Date.now()}`,
    kind: state === "approved" ? "leave-approved" : "leave-declined",
    title: state === "approved" ? "Leave approved" : "Leave request declined",
    body:
      state === "approved"
        ? `Your ${request.type.toLowerCase()} request for ${request.date} has been approved.`
        : `Your ${request.type.toLowerCase()} request for ${request.date} was declined: ${reason}`,
    postedAt: `Today, ${DEMO_WORLD.nowLabel}`,
    badge:
      state === "approved"
        ? { tone: "success", label: "Approved" }
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
  state: LeaveRequest["state"],
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
            decisionHistory: [
              ...(item.decisionHistory ?? []),
              { state, reason, at: `Today, ${DEMO_WORLD.nowLabel} (Europe/London)` },
            ],
          }
        : item,
    );
    const notify =
      request.staffId === PORTAL_STAFF_ID && (state === "approved" || state === "declined");
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
