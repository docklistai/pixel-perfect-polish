import { describe, expect, it } from "vitest";
import { operationalLeaveRange, rotaLeaveRange } from "./leaveQueryRange";

describe("leave query ranges", () => {
  it("builds a fixed bounded operational window", () => {
    expect(operationalLeaveRange(new Date("2026-07-14T23:30:00Z"))).toEqual({
      startDate: "2026-04-15",
      endDate: "2027-07-19",
    });
  });

  it("builds an exact seven-day rota overlap range", () => {
    expect(rotaLeaveRange("2026-07-13")).toEqual({
      startDate: "2026-07-13",
      endDate: "2026-07-19",
    });
  });
});
