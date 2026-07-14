import { describe, expect, it } from "vitest";
import {
  bufferedTimeRange,
  periodTimeRange,
  rollingTimeRange,
  timeQueryKeys,
} from "./timeQueryRange";

describe("time query ranges", () => {
  it("adds a one-day boundary around an exact approval/export period", () => {
    const exact = periodTimeRange({ startIso: "2026-07-13", endIso: "2026-07-19", label: "week" });
    expect(bufferedTimeRange(exact)).toEqual({
      startDate: "2026-07-12",
      endDate: "2026-07-20",
    });
  });

  it("handles month and year boundaries", () => {
    expect(bufferedTimeRange({ startDate: "2026-01-01", endDate: "2026-01-31" })).toEqual({
      startDate: "2025-12-31",
      endDate: "2026-02-01",
    });
  });

  it("builds a deterministic bounded rolling range", () => {
    expect(rollingTimeRange(new Date("2026-07-14T23:00:00Z"), 35)).toEqual({
      startDate: "2026-06-09",
      endDate: "2026-07-14",
    });
  });

  it("puts range and filter authority in the query key", () => {
    const key = timeQueryKeys.period("workspace", {
      startDate: "2026-07-13",
      endDate: "2026-07-19",
    });
    expect(key.at(-1)).toMatchObject({
      startDate: "2026-07-13",
      endDate: "2026-07-19",
      boundaryDays: 1,
      filterAuthority: "work-date-period+client-department-v1",
    });
  });
});
