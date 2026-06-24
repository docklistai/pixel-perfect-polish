import { describe, expect, it } from "vitest";
import { COMMAND_NAV_ITEMS, COMMAND_QUICK_ACTIONS } from "./commandPaletteData";

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

    expect(previewRoutes).toEqual(["/team", "/ops", "/reports", "/settings"]);
  });
});
