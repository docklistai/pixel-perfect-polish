import { describe, expect, it } from "vitest";
import { buildReportsPeriod, periodLabel } from "./reportsPeriod";

describe("Reports rota periods", () => {
  it("defaults to the current rota week and previous three rota weeks", () => {
    expect(
      buildReportsPeriod({
        timezone: "Europe/London",
        rotaStartWeekday: 0,
        preset: "four_weeks",
        now: new Date("2026-08-13T12:00:00Z"),
      }),
    ).toEqual({ startDate: "2026-07-20", endDate: "2026-08-16" });
  });

  it("honours a configured Sunday rota start", () => {
    expect(
      buildReportsPeriod({
        timezone: "Europe/London",
        rotaStartWeekday: 6,
        preset: "current_week",
        now: new Date("2026-08-13T12:00:00Z"),
      }),
    ).toEqual({ startDate: "2026-08-09", endDate: "2026-08-15" });
  });

  it("uses the workspace timezone before resolving the calendar week", () => {
    const now = new Date("2026-08-10T00:30:00Z");
    expect(
      buildReportsPeriod({
        timezone: "America/Los_Angeles",
        rotaStartWeekday: 0,
        preset: "current_week",
        now,
      }),
    ).toEqual({ startDate: "2026-08-03", endDate: "2026-08-09" });
  });

  it("formats an inclusive period without inventing a rolling-day range", () => {
    expect(periodLabel("2026-07-20", "2026-08-16")).toBe("20 Jul – 16 Aug 2026");
  });
});
