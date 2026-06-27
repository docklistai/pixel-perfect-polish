import { describe, expect, it } from "vitest";
import { noUpcomingShiftsCopy } from "./portalShiftCopy";

describe("noUpcomingShiftsCopy", () => {
  it("says 'no upcoming shifts' when a rota is published but none are upcoming", () => {
    const copy = noUpcomingShiftsCopy(true);
    expect(copy.title).toBe("No upcoming shifts");
    expect(copy.description).toMatch(/upcoming shifts on the published rota/i);
    // Must NOT imply the rota was never published.
    expect(copy.description.toLowerCase()).not.toContain("once your manager publishes");
  });

  it("says 'no published rota yet' when nothing has been published", () => {
    const copy = noUpcomingShiftsCopy(false);
    expect(copy.title).toBe("No published rota yet");
    expect(copy.description).toMatch(/once your manager publishes/i);
  });

  it("returns different copy for the two states", () => {
    expect(noUpcomingShiftsCopy(true).title).not.toBe(noUpcomingShiftsCopy(false).title);
  });
});
