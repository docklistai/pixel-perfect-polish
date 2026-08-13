import { describe, expect, it } from "vitest";
import {
  COMMAND_NAV_ITEMS,
  COMMAND_PREVIEW_ROUTES,
  COMMAND_QUICK_ACTIONS,
} from "./commandPaletteData";

describe("command palette: Add team member", () => {
  const addTeamMember = COMMAND_QUICK_ACTIONS.find((a) => a.label === "Add team member");

  it("routes to the Staff page via the staff.add intent", () => {
    // Locks the Add Staff wiring: staff.add must reach the Staff route, where it
    // opens Add Staff (not the Access Codes dialog).
    expect(addTeamMember).toBeDefined();
    expect(addTeamMember?.to).toBe("/staff");
    expect(addTeamMember?.intent).toBe("staff.add");
  });
});

describe("command palette preview routes", () => {
  it("labels preview-only manager routes", () => {
    const previewRoutes = COMMAND_NAV_ITEMS.filter((item) => item.preview).map((item) => item.to);

    // Team and Reports are both live after Phases 55 and 56.
    expect(previewRoutes).toEqual([]);
    expect(COMMAND_NAV_ITEMS.find((item) => item.to === "/ops")?.preview).toBeUndefined();
    expect(COMMAND_NAV_ITEMS.find((item) => item.to === "/team")?.preview).toBeUndefined();
  });

  it("keeps preview routes reachable everywhere, labelled rather than hidden", () => {
    expect(COMMAND_PREVIEW_ROUTES).toEqual([]);
    expect(COMMAND_NAV_ITEMS.map((item) => item.to)).toEqual([
      "/",
      "/rota",
      "/staff",
      "/time",
      "/leave",
      "/team",
      "/ops",
      "/reports",
      "/settings",
    ]);
  });
});

describe("command palette rota action copy", () => {
  it("names the rota action for what it does, not optimal AI generation", () => {
    const labels = COMMAND_QUICK_ACTIONS.map((action) => action.label);
    expect(labels).toContain("Build this week");
    expect(labels).not.toContain("Generate rota draft");
  });
});
