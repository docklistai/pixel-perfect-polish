import { describe, it, expect } from "vitest";
import { describePortalCodeIssueError, describePortalRecoveryIssueError } from "./issuePortalCode";

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

describe("describePortalRecoveryIssueError", () => {
  it("keeps authorization and eligibility failures customer-safe", () => {
    expect(describePortalRecoveryIssueError("42501")).toContain("permission");
    expect(describePortalRecoveryIssueError("P0002")).toContain("active staff member");
    expect(describePortalRecoveryIssueError("55000")).toContain("eligible");
    expect(describePortalRecoveryIssueError("22023")).toContain("reason");
  });

  it("never exposes database wording for unknown failures", () => {
    const message = describePortalRecoveryIssueError("XX999");
    expect(message).toContain("couldn't reset staff access");
    expect(message).not.toMatch(/sql|constraint|membership|rpc/i);
  });
});
