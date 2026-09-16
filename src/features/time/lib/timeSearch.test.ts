import { describe, it, expect } from "vitest";
import { parseTimeSearch } from "./timeSearch";

describe("parseTimeSearch", () => {
  it("accepts valid ISO date strings for start and end", () => {
    expect(
      parseTimeSearch({
        start: "2026-06-08",
        end: "2026-06-14",
      }),
    ).toEqual({
      start: "2026-06-08",
      end: "2026-06-14",
    });
  });

  it("accepts startDate and endDate aliases", () => {
    expect(
      parseTimeSearch({
        startDate: "2026-06-08",
        endDate: "2026-06-14",
      }),
    ).toEqual({
      start: "2026-06-08",
      end: "2026-06-14",
    });
  });

  it("returns {} for empty or invalid values", () => {
    expect(parseTimeSearch({})).toEqual({});
    expect(parseTimeSearch({ start: "invalid-date" })).toEqual({});
    expect(parseTimeSearch({ start: 12345 })).toEqual({});
    expect(parseTimeSearch({ end: null })).toEqual({});
  });
});
