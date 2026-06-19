import { describe, expect, it } from "vitest";
import { COMMAND_QUICK_ACTIONS } from "./commandPaletteData";

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
