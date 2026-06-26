import { describe, expect, it } from "vitest";
import {
  BOOTSTRAP_WORKSPACE_DEFAULTS,
  buildBootstrapWorkspaceInput,
  describeBootstrapWorkspaceError,
} from "../lib/bootstrapWorkspace";

describe("buildBootstrapWorkspaceInput", () => {
  it("trims required fields and applies starter defaults", () => {
    const result = buildBootstrapWorkspaceInput({
      workspaceName: "  Harbour Bakery  ",
      slug: "",
      timezone: "",
      locationName: "",
      departmentName: "",
    });

    expect(result).toEqual({
      ok: true,
      payload: {
        workspaceName: "Harbour Bakery",
        slug: null,
        timezone: BOOTSTRAP_WORKSPACE_DEFAULTS.timezone,
        locationName: BOOTSTRAP_WORKSPACE_DEFAULTS.locationName,
        departmentName: BOOTSTRAP_WORKSPACE_DEFAULTS.departmentName,
      },
    });
  });

  it("keeps an explicit lower-case slug", () => {
    const result = buildBootstrapWorkspaceInput({
      workspaceName: "Harbour Bakery",
      slug: "harbour-bakery",
      timezone: "Europe/London",
      locationName: "Kitchen",
      departmentName: "Bakery",
    });

    expect(result).toMatchObject({
      ok: true,
      payload: {
        slug: "harbour-bakery",
        locationName: "Kitchen",
        departmentName: "Bakery",
      },
    });
  });

  it("accepts slashless PostgreSQL timezone names such as UTC", () => {
    const result = buildBootstrapWorkspaceInput({
      workspaceName: "Harbour Bakery",
      timezone: "UTC",
    });

    expect(result).toMatchObject({
      ok: true,
      payload: { timezone: "UTC" },
    });
  });

  it("rejects blank or oversized workspace names", () => {
    expect(buildBootstrapWorkspaceInput({ workspaceName: " " }).ok).toBe(false);
    expect(buildBootstrapWorkspaceInput({ workspaceName: "x".repeat(121) }).ok).toBe(false);
  });

  it("rejects unsafe optional slug input", () => {
    const result = buildBootstrapWorkspaceInput({
      workspaceName: "Harbour Bakery",
      slug: "Bad Slug",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.slug).toMatch(/lower-case/);
  });
});

describe("describeBootstrapWorkspaceError", () => {
  it("maps common SQL states to non-leaking user-facing copy", () => {
    expect(describeBootstrapWorkspaceError("42501")).toMatch(/sign in/i);
    expect(describeBootstrapWorkspaceError("22023")).toMatch(/workspace details/i);
    expect(describeBootstrapWorkspaceError("23505")).toMatch(/already in use/i);
    expect(describeBootstrapWorkspaceError("55000")).toMatch(/already linked/i);
  });

  it("does not echo raw database messages", () => {
    expect(describeBootstrapWorkspaceError("99999", "ERROR: relation secret_table")).not.toMatch(
      /secret_table|relation/i,
    );
  });
});
