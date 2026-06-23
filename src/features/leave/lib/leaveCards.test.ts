import { describe, it, expect } from "vitest";
import {
  coverageRowsForRequest,
  leaveStateFromStatus,
  riskDrawerContext,
  teamLeaveBalances,
} from "./leaveCards";
import type { LeaveRequest } from "../types";

const liveRequest: Pick<LeaveRequest, "id" | "date" | "impact"> = {
  id: "11111111-1111-1111-1111-111111111111",
  date: "8 – 9 Jun",
  impact: "High",
};

describe("leaveStateFromStatus", () => {
  it("keeps cancelled distinct from declined", () => {
    expect(leaveStateFromStatus("cancelled")).toBe("cancelled");
    expect(leaveStateFromStatus("declined")).toBe("declined");
    expect(leaveStateFromStatus("cancelled")).not.toBe(leaveStateFromStatus("declined"));
  });

  it("passes the other states through unchanged", () => {
    expect(leaveStateFromStatus("pending")).toBe("pending");
    expect(leaveStateFromStatus("approved")).toBe("approved");
  });
});

describe("teamLeaveBalances", () => {
  it("returns no fabricated people or entitlements in live mode", () => {
    expect(teamLeaveBalances("live")).toBeNull();
  });

  it("returns the sample roster only in demo mode", () => {
    const demo = teamLeaveBalances("demo");
    expect(demo).not.toBeNull();
    expect(demo).toHaveLength(4);
    expect(demo?.[0]).toMatchObject({ name: "Sophie Carter", used: 13, total: 28 });
  });
});

describe("coverageRowsForRequest", () => {
  it("never invents coverage percentages for a live request", () => {
    expect(coverageRowsForRequest(liveRequest, "live")).toBeNull();
  });

  it("returns illustrative rows only in demo mode", () => {
    const rows = coverageRowsForRequest({ id: "l3", date: "21 Jun", impact: "High" }, "demo");
    expect(rows).not.toBeNull();
    expect(rows?.[0]).toMatchObject({ value: 50, tone: "danger" });
  });
});

describe("riskDrawerContext", () => {
  it("reflects the selected request's department and dates", () => {
    const ctx = riskDrawerContext({ dept: "Kitchen", date: "16 – 17 Jun" });
    expect(ctx.title).toBe("Coverage check — Kitchen");
    expect(ctx.dateLabel).toBe("16 – 17 Jun");
    expect(ctx.dept).toBe("Kitchen");
  });

  it("falls back to neutral copy when nothing is selected", () => {
    const ctx = riskDrawerContext(null);
    expect(ctx.title).toBe("Coverage check");
    expect(ctx.dept).toBe("the team");
  });
});
