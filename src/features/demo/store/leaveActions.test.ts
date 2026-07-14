import { describe, expect, it } from "vitest";
import { createWorkspaceStore } from "./createWorkspaceStore";
import { setLeaveRequestState } from "./leaveActions";
import { seedWorkspaceState } from "./seedWorkspaceState";

describe("demo leave decisions", () => {
  it("notifies the portal staff member when a manager cancels approved leave", () => {
    const store = createWorkspaceStore(seedWorkspaceState());

    setLeaveRequestState(store, "l6", "cancelled", "Coverage requirements changed.");

    const request = store.getState().leaveRequests.find((item) => item.id === "l6");
    const notification = store
      .getState()
      .portalNotifications.find((item) => item.relatedLeaveRequestId === "l6");
    expect(request).toMatchObject({ state: "cancelled", cancellationSource: "manager" });
    expect(notification).toMatchObject({
      kind: "leave-cancelled",
      important: true,
      unread: true,
    });
    expect(notification?.body).toContain("Coverage requirements changed.");
  });
});
