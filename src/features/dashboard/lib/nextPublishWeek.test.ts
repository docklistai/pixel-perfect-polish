import { describe, it, expect } from "vitest";
import {
  formatDashboardPublishWeekLabel,
  formatPublishWeekLabel,
  getNextPublishWeekLabel,
} from "./nextPublishWeek";
import { getWeekStartIso } from "@/features/rota/lib/weekHelpers";

describe("formatPublishWeekLabel", () => {
  it("formats a week-start ISO date as 'D Mon YYYY'", () => {
    expect(formatPublishWeekLabel("2026-06-15")).toBe("15 Jun 2026");
  });

  it("does not drift across timezones for early-month dates", () => {
    expect(formatPublishWeekLabel("2026-01-01")).toBe("1 Jan 2026");
    expect(formatPublishWeekLabel("2026-12-31")).toBe("31 Dec 2026");
  });
});

describe("getNextPublishWeekLabel", () => {
  it("derives the label from the shared week helper rather than a hardcoded date", () => {
    expect(getNextPublishWeekLabel()).toBe(formatPublishWeekLabel(getWeekStartIso(1)));
  });
});

describe("formatDashboardPublishWeekLabel", () => {
  it("uses the live rota week label instead of the stale next-publish helper", () => {
    expect(formatDashboardPublishWeekLabel("2026-06-22")).toBe("22 Jun 2026");
    expect(formatDashboardPublishWeekLabel("2026-06-22")).not.toBe("15 Jun 2026");
  });
});
