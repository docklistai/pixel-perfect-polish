import { describe, expect, it } from "vitest";
import {
  getCompactLiveProfileEmptyCopy,
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
