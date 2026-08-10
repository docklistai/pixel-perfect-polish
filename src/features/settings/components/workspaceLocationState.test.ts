import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * The two location-shaped honesty rules the pilot Settings surface must hold:
 * a locked time zone says why it is locked, and a workspace with no active
 * location says so instead of showing a form that cannot create one.
 */

const read = (file: string) => readFileSync(`src/features/settings/components/${file}`, "utf8");

const identityFields = read("WorkspaceIdentityFields.tsx");
const notice = read("NoActiveLocationNotice.tsx");
const workspaceTab = read("WorkspaceTab.tsx");

describe("time zone field", () => {
  it("disables the select from the server-provided lock, not local state", () => {
    expect(identityFields).toContain("location?.timezoneLocked");
    expect(identityFields).toMatch(
      /editable\s*=\s*profile\.enabled && location !== null && !locked/,
    );
  });

  it("says why it is locked in terms of existing shifts", () => {
    expect(identityFields).toContain("shifts are already scheduled here");
    expect(identityFields).toMatch(/rota and in the staff portal/);
  });
});

describe("no active location", () => {
  it("replaces both location fields rather than disabling them", () => {
    expect(workspaceTab).toContain("profile.hasNoActiveLocation");
    expect(workspaceTab).toContain("<NoActiveLocationNotice");
    // The fields live in the else branch, so neither renders in that state.
    const branch = workspaceTab.slice(workspaceTab.indexOf("profile.hasNoActiveLocation"));
    expect(branch.indexOf("<NoActiveLocationNotice")).toBeLessThan(
      branch.indexOf("<WorkspaceLocationField"),
    );
  });

  it("offers no creation affordance at all", () => {
    // Anything clickable or typeable here would imply Settings can make one.
    expect(notice).not.toMatch(/<button|<input|<form|onClick|ActionButton|TextField/);
  });

  it("names the state and routes the manager to support", () => {
    expect(notice).toContain("No active location");
    expect(notice).toContain("can&apos;t create one");
    expect(notice).toContain("SUPPORT_EMAIL");
  });

  it("is only claimed once a live read has proved it", () => {
    const hook = readFileSync("src/features/settings/hooks/useWorkspaceProfile.ts", "utf8");
    expect(hook).toContain(
      "hasNoActiveLocation: query.isSuccess && query.data.primaryLocation === null",
    );
  });
});
