import { describe, expect, it } from "vitest";
import {
  STAFF_PANEL_TABS,
  getCompactLiveProfileEmptyCopy,
  getStaffPanelTabs,
  getStaffSurfaceCapabilities,
} from "./staffSurfaceCapabilities";

describe("getStaffSurfaceCapabilities", () => {
  it("hides unsupported bulk and destructive actions for live staff", () => {
    expect(getStaffSurfaceCapabilities("live")).toEqual({
      showDemoBulkActions: false,
      showDemoRowActions: false,
      canIssueAccessCodes: true,
    });
  });

  it("keeps demo-only controls gated and disables access-code issuance", () => {
    expect(getStaffSurfaceCapabilities("demo")).toEqual({
      showDemoBulkActions: true,
      showDemoRowActions: true,
      canIssueAccessCodes: false,
    });
  });
});

describe("getCompactLiveProfileEmptyCopy", () => {
  it("describes disconnected live documents honestly", () => {
    expect(getCompactLiveProfileEmptyCopy("documents")).toBe(
      "Document storage is not connected yet.",
    );
  });

  it("describes disconnected live manager notes honestly", () => {
    expect(getCompactLiveProfileEmptyCopy("notes")).toBe("Manager notes are not connected yet.");
  });
});

describe("getStaffPanelTabs", () => {
  it("offers a live row only the section with a live source", () => {
    expect(getStaffPanelTabs("live")).toEqual(["Overview"]);
  });

  it("hides the two sections that can never hold anything during the pilot", () => {
    const live = getStaffPanelTabs("live");
    expect(live).not.toContain("Documents");
    expect(live).not.toContain("Notes");
  });

  it("keeps every section for the demo roster, which has fixtures behind them", () => {
    expect(getStaffPanelTabs("demo")).toEqual(["Overview", "Documents", "Notes"]);
    expect(getStaffPanelTabs("demo")).toEqual([...STAFF_PANEL_TABS]);
  });

  it("never offers a section the panel cannot render", () => {
    for (const source of ["live", "demo"] as const) {
      for (const tab of getStaffPanelTabs(source)) {
        expect(STAFF_PANEL_TABS).toContain(tab);
      }
    }
  });
});
