import { describe, expect, it } from "vitest";
import { shouldReadTimePulse } from "./timePulseGate";

const base = {
  hasSupabase: true,
  workspaceId: "ws-1",
  role: "manager",
  labsTimePulseEnabled: true,
};

describe("time pulse gate — off means off", () => {
  it("reads nothing while the Labs flag is off", () => {
    expect(shouldReadTimePulse({ ...base, labsTimePulseEnabled: false })).toBe(false);
  });

  it("reads once an owner or manager has turned the flag on", () => {
    expect(shouldReadTimePulse({ ...base, role: "manager" })).toBe(true);
    expect(shouldReadTimePulse({ ...base, role: "owner" })).toBe(true);
  });

  it("never reads for staff, even with the flag on", () => {
    expect(shouldReadTimePulse({ ...base, role: "staff" })).toBe(false);
  });

  it("never reads without a workspace or a live Supabase surface", () => {
    expect(shouldReadTimePulse({ ...base, workspaceId: null })).toBe(false);
    expect(shouldReadTimePulse({ ...base, hasSupabase: false })).toBe(false);
  });

  it("treats an unknown role as denied rather than allowed", () => {
    expect(shouldReadTimePulse({ ...base, role: null })).toBe(false);
    expect(shouldReadTimePulse({ ...base, role: "supervisor" })).toBe(false);
  });
});
