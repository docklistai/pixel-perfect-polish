import { describe, expect, it } from "vitest";
import { resolveStaffRosterState } from "./staffRosterState";

const demoRows = [{ id: "demo" }];
const liveRows = [{ id: "live" }];

describe("resolveStaffRosterState", () => {
  it("uses demo rows only when live staff is not enabled", () => {
    expect(
      resolveStaffRosterState({
        liveEnabled: false,
        isLoading: false,
        isError: false,
        liveRows,
        demoRows,
      }),
    ).toEqual({ source: "demo", rows: demoRows, state: "ready" });
  });

  it("does not leak demo rows while live staff is loading", () => {
    expect(
      resolveStaffRosterState({
        liveEnabled: true,
        isLoading: true,
        isError: false,
        liveRows: undefined,
        demoRows,
      }),
    ).toEqual({ source: "live", rows: [], state: "loading" });
  });

  it("does not leak demo rows when the live staff read fails", () => {
    expect(
      resolveStaffRosterState({
        liveEnabled: true,
        isLoading: false,
        isError: true,
        liveRows: undefined,
        demoRows,
      }),
    ).toEqual({ source: "live", rows: [], state: "error" });
  });

  it("keeps a successful empty live roster authoritative", () => {
    expect(
      resolveStaffRosterState({
        liveEnabled: true,
        isLoading: false,
        isError: false,
        liveRows: [],
        demoRows,
      }),
    ).toEqual({ source: "live", rows: [], state: "ready" });
  });
});
