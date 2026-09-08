import { describe, expect, it } from "vitest";

import { ALL_PROFILE_TABS, LIVE_PROFILE_TABS, resolveProfileTab } from "./profileTabs";

describe("live profile tab set", () => {
  it("offers only the sections a live member actually has", () => {
    expect(LIVE_PROFILE_TABS.map((tab) => tab.id)).toEqual([
      "overview",
      "schedule",
      "time",
      "leave",
    ]);
  });

  it("hides the three sections with no live source during the pilot", () => {
    const live = new Set(LIVE_PROFILE_TABS.map((tab) => tab.id));
    for (const hidden of ["documents", "notes", "insights"]) {
      expect(live.has(hidden as (typeof LIVE_PROFILE_TABS)[number]["id"])).toBe(false);
    }
  });

  it("keeps every section available to demo profiles", () => {
    expect(ALL_PROFILE_TABS.map((tab) => tab.id)).toEqual([
      "overview",
      "schedule",
      "time",
      "leave",
      "documents",
      "notes",
      "insights",
    ]);
  });

  it("preserves the labels the demo profile already showed", () => {
    expect(ALL_PROFILE_TABS.find((tab) => tab.id === "leave")?.label).toBe("Leave & Absence");
    expect(ALL_PROFILE_TABS.find((tab) => tab.id === "insights")?.label).toBe("Work patterns");
  });
});

describe("resolveProfileTab", () => {
  it("honours a requested tab the profile has", () => {
    expect(resolveProfileTab("time", LIVE_PROFILE_TABS)).toBe("time");
  });

  it("falls back to the first available tab for a hidden deep link", () => {
    // /staff/<id>?tab=notes on a live member must land somewhere real.
    expect(resolveProfileTab("notes", LIVE_PROFILE_TABS)).toBe("overview");
    expect(resolveProfileTab("documents", LIVE_PROFILE_TABS)).toBe("overview");
    expect(resolveProfileTab("insights", LIVE_PROFILE_TABS)).toBe("overview");
  });

  it("falls back when nothing was requested", () => {
    expect(resolveProfileTab(undefined, LIVE_PROFILE_TABS)).toBe("overview");
  });

  it("still resolves hidden tabs for the full demo set", () => {
    expect(resolveProfileTab("notes", ALL_PROFILE_TABS)).toBe("notes");
  });
});
