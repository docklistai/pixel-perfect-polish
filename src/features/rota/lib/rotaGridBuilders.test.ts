import { describe, expect, it } from "vitest";
import { buildStaffRows } from "./rotaGridBuilders";
import type { LeaveRequest } from "@/features/leave/types";
import type { StaffMember } from "../types";

const member: StaffMember = {
  id: "staff-1",
  name: "Ana",
  role: "Chef",
  hrs: "40h",
  img: 1,
  tone: "info",
};

function leave(state: LeaveRequest["state"], id: string = state): LeaveRequest {
  return {
    id,
    staffId: "staff-1",
    n: "Ana",
    role: "Chef",
    dept: "Kitchen",
    date: "8 Jun",
    startIso: "2026-06-08",
    endIso: "2026-06-08",
    days: 1,
    type: "Annual leave",
    impact: "Low",
    tone: "warning",
    state,
    notice: 7,
    reason: "",
    img: 1,
    balance: "",
    submitted: "",
    coverNote: "",
  };
}

describe("buildStaffRows leave visibility", () => {
  it("marks pending leave as a soft cell state", () => {
    const [row] = buildStaffRows([member], [], [leave("pending")], ["2026-06-08"]);
    expect(row?.cells[0]).toMatchObject({ leaveState: "pending" });
    expect(row?.cells[0]?.hasLeave).toBeUndefined();
  });

  it("prioritises approved leave over pending leave", () => {
    const [row] = buildStaffRows(
      [member],
      [],
      [leave("pending"), leave("approved", "approved-1")],
      ["2026-06-08"],
    );
    expect(row?.cells[0]).toMatchObject({ hasLeave: true, leaveState: "approved" });
  });
});
