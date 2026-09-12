import { describe, it, expect } from "vitest";
import {
  parseSettingsSearch,
  resolveSettingsSearchTab,
  DEFAULT_SETTINGS_TAB,
} from "./settingsSearch";

describe("parseSettingsSearch", () => {
  it("accepts the stable key 'workspace'", () => {
    expect(parseSettingsSearch({ tab: "workspace" })).toEqual({ tab: "workspace" });
  });

  it("returns {} when search is empty", () => {
    expect(parseSettingsSearch({})).toEqual({});
  });

  it("rejects the display label — the URL contract is not the display copy", () => {
    expect(parseSettingsSearch({ tab: "Workspace" })).toEqual({});
  });

  it("rejects an unknown key", () => {
    expect(parseSettingsSearch({ tab: "Bogus" })).toEqual({});
  });

  it("rejects non-string values", () => {
    expect(parseSettingsSearch({ tab: 3 })).toEqual({});
    expect(parseSettingsSearch({ tab: null })).toEqual({});
  });
});

describe("resolveSettingsSearchTab", () => {
  it("maps the stable key to the internal Settings tab label", () => {
    expect(resolveSettingsSearchTab({ tab: "workspace" })).toBe("Workspace");
  });

  it("returns undefined when no key is present", () => {
    expect(resolveSettingsSearchTab({})).toBeUndefined();
  });
});

describe("DEFAULT_SETTINGS_TAB", () => {
  it("is General", () => {
    expect(DEFAULT_SETTINGS_TAB).toBe("General");
  });
});
