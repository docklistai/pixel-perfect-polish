import { describe, it, expect } from "vitest";
import { resolveLeaveView } from "./leaveView";
import type { LeaveRequest } from "../types";

function req(id: string, state: LeaveRequest["state"] = "pending"): LeaveRequest {
  return {
    id,
    staffId: "s1",
    n: "Sam Doe",
    role: "Barista",
    dept: "Bar",
    date: "8 – 9 Jun",
    startIso: "2026-06-08",
    endIso: "2026-06-09",
    days: 2,
    type: "Annual leave",
    impact: "Low",
    tone: "success",
    state,
    notice: 10,
    reason: "Trip",
    img: 1,
    balance: "—",
    submitted: "1 Jun",
    coverNote: "",
  };
}

const demoRequests = [req("demo-1"), req("demo-2")];
const liveRequests = [req("11111111-1111-1111-1111-111111111111", "approved")];

describe("resolveLeaveView", () => {
  it("shows demo requests only when live mode is not enabled", () => {
    const view = resolveLeaveView({
      enabled: false,
      isSuccess: false,
      isLoading: false,
      isError: false,
      liveRequests: undefined,
      demoRequests,
    });
    expect(view).toEqual({ requests: demoRequests, source: "demo", state: "demo" });
  });

  it("never returns demo requests during live loading", () => {
    const view = resolveLeaveView({
      enabled: true,
      isSuccess: false,
      isLoading: true,
      isError: false,
      liveRequests: undefined,
      demoRequests,
    });
    expect(view.source).toBe("live");
    expect(view.state).toBe("live-loading");
    expect(view.requests).toEqual([]);
  });

  it("never returns demo requests during a live error", () => {
    const view = resolveLeaveView({
      enabled: true,
      isSuccess: false,
      isLoading: false,
      isError: true,
      liveRequests: undefined,
      demoRequests,
    });
    expect(view.source).toBe("live");
    expect(view.state).toBe("live-error");
    expect(view.requests).toEqual([]);
  });

  it("returns the live rows once the read succeeds", () => {
    const view = resolveLeaveView({
      enabled: true,
      isSuccess: true,
      isLoading: false,
      isError: false,
      liveRequests,
      demoRequests,
    });
    expect(view).toEqual({ requests: liveRequests, source: "live", state: "live-ready" });
  });

  it("treats a successful empty read as an honest empty live state, not demo", () => {
    const view = resolveLeaveView({
      enabled: true,
      isSuccess: true,
      isLoading: false,
      isError: false,
      liveRequests: [],
      demoRequests,
    });
    expect(view.requests).toEqual([]);
    expect(view.source).toBe("live");
  });
});
