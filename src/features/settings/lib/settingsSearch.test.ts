import { describe, it, expect } from "vitest";
import {
  parseSettingsSearch,
  resolveSettingsSearchTab,
  DEFAULT_SETTINGS_TAB,
} from "./settingsSearch";

describe("parseSettingsSearch", () => {
  it("accepts stable keys and aliases", () => {
    const keys = [
      "general",
      "workspace",
      "locations",
      "teams",
      "roles",
      "permissions",
      "rota",
      "scheduling",
      "leave",
      "time",
      "attendance",
      "notifications",
      "manager-support",
      "labs",
      "privacy",
      "data-privacy",
      "plan",
      "plan-limits",
    ];
    for (const key of keys) {
      expect(parseSettingsSearch({ tab: key })).toEqual({ tab: key });
    }
  });

  it("returns {} when search is empty", () => {
    expect(parseSettingsSearch({})).toEqual({});
  });

  it("rejects the display label — the URL contract is not the display copy", () => {
    expect(parseSettingsSearch({ tab: "Workspace" })).toEqual({});
    expect(parseSettingsSearch({ tab: "General" })).toEqual({});
    expect(parseSettingsSearch({ tab: "Rota & scheduling" })).toEqual({});
    expect(parseSettingsSearch({ tab: "Leave" })).toEqual({});
  });

  it("rejects an unknown key", () => {
    expect(parseSettingsSearch({ tab: "Bogus" })).toEqual({});
    expect(parseSettingsSearch({ tab: "billing" })).toEqual({});
  });

  it("rejects non-string values", () => {
    expect(parseSettingsSearch({ tab: 3 })).toEqual({});
    expect(parseSettingsSearch({ tab: null })).toEqual({});
    expect(parseSettingsSearch({ tab: undefined })).toEqual({});
  });
});

describe("resolveSettingsSearchTab", () => {
  it("maps stable keys and aliases to internal SettingsContentTab labels", () => {
    expect(resolveSettingsSearchTab({ tab: "general" })).toBe("General");
    expect(resolveSettingsSearchTab({ tab: "workspace" })).toBe("Workspace");
    expect(resolveSettingsSearchTab({ tab: "locations" })).toBe("Locations & teams");
    expect(resolveSettingsSearchTab({ tab: "teams" })).toBe("Locations & teams");
    expect(resolveSettingsSearchTab({ tab: "roles" })).toBe("Roles & permissions");
    expect(resolveSettingsSearchTab({ tab: "permissions" })).toBe("Roles & permissions");
    expect(resolveSettingsSearchTab({ tab: "rota" })).toBe("Rota & scheduling");
    expect(resolveSettingsSearchTab({ tab: "scheduling" })).toBe("Rota & scheduling");
    expect(resolveSettingsSearchTab({ tab: "leave" })).toBe("Leave");
    expect(resolveSettingsSearchTab({ tab: "time" })).toBe("Time & attendance");
    expect(resolveSettingsSearchTab({ tab: "attendance" })).toBe("Time & attendance");
    expect(resolveSettingsSearchTab({ tab: "notifications" })).toBe("Notifications");
    expect(resolveSettingsSearchTab({ tab: "manager-support" })).toBe("Manager support");
    expect(resolveSettingsSearchTab({ tab: "labs" })).toBe("Labs");
    expect(resolveSettingsSearchTab({ tab: "privacy" })).toBe("Data & privacy");
    expect(resolveSettingsSearchTab({ tab: "data-privacy" })).toBe("Data & privacy");
    expect(resolveSettingsSearchTab({ tab: "plan" })).toBe("Plan & limits");
    expect(resolveSettingsSearchTab({ tab: "plan-limits" })).toBe("Plan & limits");
  });

  it("returns undefined when no key is present or key is unmapped", () => {
    expect(resolveSettingsSearchTab({})).toBeUndefined();
  });
});

describe("DEFAULT_SETTINGS_TAB", () => {
  it("is General", () => {
    expect(DEFAULT_SETTINGS_TAB).toBe("General");
  });
});
