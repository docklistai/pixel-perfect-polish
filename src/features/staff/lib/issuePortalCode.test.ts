import { describe, it, expect } from "vitest";
import { describePortalCodeIssueError } from "./issuePortalCode";

describe("describePortalCodeIssueError (D5 — no dev-speak)", () => {
  it("explains the missing-membership case in plain manager language", () => {
    const message = describePortalCodeIssueError("55000");
    expect(message).toBe(
      "This staff member needs to be saved to your team before a portal code can be issued.",
    );
  });

  it("never exposes internal/database terms to managers", () => {
    for (const state of ["55000", "42501", "P0002", null, "unknown"]) {
      const message = describePortalCodeIssueError(state);
      expect(message.toLowerCase()).not.toContain("seed");
      expect(message.toLowerCase()).not.toContain("membership");
      expect(message.toLowerCase()).not.toContain("bind");
    }
  });

  it("maps permission and lookup errors to honest copy", () => {
    expect(describePortalCodeIssueError("42501")).toContain("permission");
    expect(describePortalCodeIssueError("P0002")).toContain("isn't in this workspace");
    expect(describePortalCodeIssueError(null)).toContain("couldn't issue a code");
  });
});
