import { describe, expect, it } from "vitest";
import {
  buildRoleColourKey,
  DEPT_COLOUR_PRESETS,
  resolvePresetIdForRole,
} from "./deptColours";

describe("resolvePresetIdForRole", () => {
  it("maps a known role to its department preset", () => {
    expect(resolvePresetIdForRole("Head Chef")).toBe("amber");
    expect(resolvePresetIdForRole("Bartender")).toBe("purple");
    expect(resolvePresetIdForRole("Waiter")).toBe("blue");
  });

  it("falls back to slate for an unknown role", () => {
    expect(resolvePresetIdForRole("Dockmaster")).toBe("slate");
  });

  it("prefers the workspace role-colour config over the department mapping", () => {
    const config = { waiter: "teal" };
    // Waiter defaults to blue (FOH); config overrides it to teal.
    expect(resolvePresetIdForRole("Waiter", config)).toBe("teal");
    // A role not in the config still uses the built-in mapping.
    expect(resolvePresetIdForRole("Bartender", config)).toBe("purple");
    // An invalid configured preset is ignored.
    expect(resolvePresetIdForRole("Waiter", { waiter: "neon" })).toBe("blue");
  });
});

describe("buildRoleColourKey", () => {
  it("returns distinct role labels with their swatch, sorted alphabetically", () => {
    const key = buildRoleColourKey(["Waiter", "Head Chef", "Bartender"]);
    expect(key.map((entry) => entry.label)).toEqual(["Bartender", "Head Chef", "Waiter"]);
    expect(key.find((entry) => entry.label === "Head Chef")?.swatch).toBe(
      DEPT_COLOUR_PRESETS.amber!.swatch,
    );
  });

  it("dedupes case-insensitively and ignores blank labels", () => {
    const key = buildRoleColourKey(["Waiter", "waiter", "  ", ""]);
    expect(key).toHaveLength(1);
    expect(key[0]!.label).toBe("Waiter");
  });

  it("keeps roles that share a colour as separate entries", () => {
    // Waiter and Host both resolve to the FOH (blue) preset but are distinct roles.
    const key = buildRoleColourKey(["Waiter", "Host"]);
    expect(key).toHaveLength(2);
    expect(key.every((entry) => entry.swatch === DEPT_COLOUR_PRESETS.blue!.swatch)).toBe(true);
  });

  it("returns an empty list when there are no roles", () => {
    expect(buildRoleColourKey([])).toEqual([]);
  });
});
