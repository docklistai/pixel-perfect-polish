import { describe, expect, it } from "vitest";
import { nextPublishedShiftEmptyText, noUpcomingShiftsCopy } from "./portalShiftCopy";

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

describe("nextPublishedShiftEmptyText (Time tab 'Next published shift' card)", () => {
  it("does not claim nothing was published when a rota exists but no shift is upcoming", () => {
    // The released defect: this card said "No published rota yet" even though
    // the manager had published — the member's shifts had simply all passed.
    const text = nextPublishedShiftEmptyText(true);
    expect(text).toBe("No upcoming shifts");
    expect(text.toLowerCase()).not.toContain("no published rota");
  });

  it("still says nothing is published when nothing is", () => {
    expect(nextPublishedShiftEmptyText(false)).toBe("No published rota yet");
  });

  it("stays consistent with the Home and Shifts empty states", () => {
    expect(nextPublishedShiftEmptyText(true)).toBe(noUpcomingShiftsCopy(true).title);
    expect(nextPublishedShiftEmptyText(false)).toBe(noUpcomingShiftsCopy(false).title);
  });
});
