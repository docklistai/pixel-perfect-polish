import { describe, expect, it } from "vitest";
import {
  mapLeaveRequest,
  upcomingApprovedLeaveRequests,
  type LeaveRequestViewRow,
} from "./portalLiveData";

function leaveRow(overrides: Partial<LeaveRequestViewRow> = {}): LeaveRequestViewRow {
  return {
    leave_request_id: "leave-1",
    staff_member_id: "staff-1",
    leave_type: "annual_leave",
    start_date: "2026-06-24",
    end_date: "2026-06-25",
    reason: "Family trip",
    status: "pending",
    submitted_at: "2026-06-10T09:00:00.000Z",
    decided_at: null,
    decision_reason: null,
    ...overrides,
  };
}

describe("mapLeaveRequest", () => {
  it("keeps cancelled staff leave distinct from manager-declined leave", () => {
    expect(mapLeaveRequest(leaveRow({ status: "cancelled" }))).toMatchObject({
      status: "cancelled",
      decisionReason: "Withdrawn by staff",
    });
  });

  it("keeps declined leave as declined", () => {
    expect(
      mapLeaveRequest(
        leaveRow({ status: "declined", decision_reason: "Coverage is already tight." }),
      ),
    ).toMatchObject({
      status: "declined",
      decisionReason: "Coverage is already tight.",
    });
  });

  it("keeps pending and approved leave statuses unchanged", () => {
    expect(mapLeaveRequest(leaveRow({ status: "pending" })).status).toBe("pending");
    expect(mapLeaveRequest(leaveRow({ status: "approved" })).status).toBe("approved");
  });
});

describe("upcomingApprovedLeaveRequests", () => {
  it("does not include cancelled leave as active approved leave", () => {
    const approved = mapLeaveRequest(
      leaveRow({ leave_request_id: "approved", status: "approved" }),
    );
    const cancelled = mapLeaveRequest(
      leaveRow({ leave_request_id: "cancelled", status: "cancelled" }),
    );

    expect(upcomingApprovedLeaveRequests([approved, cancelled], "2026-06-23")).toEqual([approved]);
  });
});
