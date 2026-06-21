import { describe, it, expect } from "vitest";
import { resolveTimeView } from "./timeView";
import type { StoredTimesheetRow } from "../types";

const demoRows = [{ id: "demo-1" }] as unknown as StoredTimesheetRow[];
const liveRows = [{ id: "live-1" }] as unknown as StoredTimesheetRow[];

const base = {
  enabled: true,
  isSuccess: false,
  isLoading: false,
  isError: false,
  liveRows: undefined,
  demoRows,
};

describe("resolveTimeView", () => {
  it("shows demo rows only when live mode is not active", () => {
    const view = resolveTimeView({ ...base, enabled: false });
    expect(view.source).toBe("demo");
    expect(view.state).toBe("demo");
    expect(view.rows).toBe(demoRows);
  });

  it("never falls back to demo rows while a live read is loading", () => {
    const view = resolveTimeView({ ...base, isLoading: true });
    expect(view.source).toBe("live");
    expect(view.state).toBe("live-loading");
    expect(view.rows).toEqual([]);
    expect(view.isLoading).toBe(true);
  });

  it("never falls back to demo rows when a live read errors", () => {
    const view = resolveTimeView({ ...base, isError: true });
    expect(view.source).toBe("live");
    expect(view.state).toBe("live-error");
    expect(view.rows).toEqual([]);
    expect(view.isError).toBe(true);
  });

  it("shows live rows once the read succeeds", () => {
    const view = resolveTimeView({ ...base, isSuccess: true, liveRows });
    expect(view.source).toBe("live");
    expect(view.state).toBe("live-ready");
    expect(view.rows).toBe(liveRows);
  });

  it("shows an honest empty live view when the read succeeds with no rows", () => {
    const view = resolveTimeView({ ...base, isSuccess: true, liveRows: [] });
    expect(view.state).toBe("live-ready");
    expect(view.rows).toEqual([]);
  });
});
