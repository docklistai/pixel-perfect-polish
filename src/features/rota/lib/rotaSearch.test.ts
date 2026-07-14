import { describe, expect, it } from "vitest";
import { MAX_ROTA_WEEK_OFFSET, parseRotaWeekSearch } from "./rotaSearch";

describe("parseRotaWeekSearch", () => {
  it("accepts an in-range integer week offset", () => {
    expect(parseRotaWeekSearch({ week: 0 })).toEqual({ week: 0 });
    expect(parseRotaWeekSearch({ week: -1 })).toEqual({ week: -1 });
    expect(parseRotaWeekSearch({ week: 2 })).toEqual({ week: 2 });
  });

  it("coerces a numeric string (as URLs deliver search params)", () => {
    expect(parseRotaWeekSearch({ week: "2" })).toEqual({ week: 2 });
    expect(parseRotaWeekSearch({ week: "-3" })).toEqual({ week: -3 });
  });

  it("accepts the inclusive range bounds", () => {
    expect(parseRotaWeekSearch({ week: MAX_ROTA_WEEK_OFFSET })).toEqual({
      week: MAX_ROTA_WEEK_OFFSET,
    });
    expect(parseRotaWeekSearch({ week: -MAX_ROTA_WEEK_OFFSET })).toEqual({
      week: -MAX_ROTA_WEEK_OFFSET,
    });
  });

  it("ignores a missing week param", () => {
    expect(parseRotaWeekSearch({})).toEqual({});
  });

  it("ignores out-of-range offsets", () => {
    expect(parseRotaWeekSearch({ week: MAX_ROTA_WEEK_OFFSET + 1 })).toEqual({});
    expect(parseRotaWeekSearch({ week: -MAX_ROTA_WEEK_OFFSET - 1 })).toEqual({});
  });

  it("ignores non-integer and non-numeric values", () => {
    expect(parseRotaWeekSearch({ week: 1.5 })).toEqual({});
    expect(parseRotaWeekSearch({ week: "abc" })).toEqual({});
    expect(parseRotaWeekSearch({ week: "" })).toEqual({});
    expect(parseRotaWeekSearch({ week: null })).toEqual({});
    expect(parseRotaWeekSearch({ week: true })).toEqual({});
  });

  it("accepts a UUID location and lowercases it", () => {
    expect(parseRotaWeekSearch({ location: "32000000-0000-4000-8000-000000000001" })).toEqual({
      location: "32000000-0000-4000-8000-000000000001",
    });
    expect(parseRotaWeekSearch({ location: "32000000-0000-4000-8000-00000000000A" })).toEqual({
      location: "32000000-0000-4000-8000-00000000000a",
    });
  });

  it("ignores a malformed location and keeps a valid week", () => {
    expect(parseRotaWeekSearch({ week: 1, location: "not-a-uuid" })).toEqual({ week: 1 });
    expect(parseRotaWeekSearch({ location: 7 })).toEqual({});
    expect(parseRotaWeekSearch({ location: "" })).toEqual({});
  });
});
