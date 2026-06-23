import { describe, it, expect } from "vitest";
import { weekRangeOf } from "./leaveDates";

describe("weekRangeOf", () => {
  it("returns the Monday–Sunday week containing the date", () => {
    // 2026-06-11 is a Thursday.
    expect(weekRangeOf("2026-06-11")).toEqual({ startIso: "2026-06-08", endIso: "2026-06-14" });
  });

  it("treats Monday and Sunday as the same week", () => {
    expect(weekRangeOf("2026-06-08")).toEqual({ startIso: "2026-06-08", endIso: "2026-06-14" });
    expect(weekRangeOf("2026-06-14")).toEqual({ startIso: "2026-06-08", endIso: "2026-06-14" });
  });

  it("crosses month boundaries", () => {
    // 2026-07-01 is a Wednesday → week starts Mon 29 Jun.
    expect(weekRangeOf("2026-07-01")).toEqual({ startIso: "2026-06-29", endIso: "2026-07-05" });
  });
});
