import type { LeaveRequest } from "@/features/leave/types";
import type { PortalNotification } from "@/features/staff-portal/types";
import { DEMO_WORLD } from "@/features/demo/data/demoWorld";
import type { WorkspaceStore } from "./createWorkspaceStore";
import { CalendarOff } from "lucide-react";

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

export function createLeaveRequest(
  store: WorkspaceStore,
  request: LeaveRequest,
  notifyManager = false,
): void {
  store.setState((current) => ({
    ...current,
    leaveRequests: [request, ...current.leaveRequests],
    managerNotifications: notifyManager
      ? [
          {
            id: `manager-leave-${request.id}`,
            icon: CalendarOff,
            tone: request.impact === "High" ? "red" : "purple",
            title: `${request.n} requested leave`,
            body: `${request.date} · ${request.impact} coverage impact.`,
            action: "Review",
            time: DEMO_WORLD.nowLabel,
            read: false,
            to: "/leave",
          },
          ...current.managerNotifications,
        ]
      : current.managerNotifications,
  }));
}
