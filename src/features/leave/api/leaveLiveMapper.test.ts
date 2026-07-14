import { describe, expect, it } from "vitest";
import { mapLeaveRequest, type LeaveRequestRow } from "./leaveLiveMapper";

function cancelled(decidedAt: string | null): LeaveRequestRow {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    staff_member_id: "22222222-2222-4222-8222-222222222222",
    leave_type: "annual_leave",
    start_date: "2026-07-20",
    end_date: "2026-07-21",
    reason: "Family appointment",
    status: "cancelled",
    submitted_at: "2026-07-10T09:00:00Z",
    decided_at: decidedAt,
    decision_reason: decidedAt ? "Operational plan changed" : null,
  };
}

describe("mapLeaveRequest cancellation provenance", () => {
  it("recognises a staff withdrawal from absent manager decision evidence", () => {
    expect(mapLeaveRequest(cancelled(null))).toMatchObject({
      state: "cancelled",
      cancellationSource: "staff",
      decisionHistory: undefined,
    });
  });

  it("recognises a manager cancellation and retains its reason", () => {
    expect(mapLeaveRequest(cancelled("2026-07-14T10:00:00Z"))).toMatchObject({
      state: "cancelled",
      cancellationSource: "manager",
      decisionHistory: [
        {
          state: "cancelled",
          reason: "Operational plan changed",
          at: "2026-07-14T10:00:00Z",
        },
      ],
    });
  });
});
