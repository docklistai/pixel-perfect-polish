import type { SettingsContentTab } from "../components/SettingsContent";

/**
 * Stable, addressable Settings tabs. Deliberately small: only a tab that
 * needs a deep link from outside Settings gets a key here — this is not a
 * mirror of every entry in settingsTabs, and the key must never be a display
 * label (labels can change; this URL contract must not).
 */
export type SettingsTabKey =
  | "general"
  | "workspace"
  | "locations"
  | "teams"
  | "roles"
  | "permissions"
  | "rota"
  | "scheduling"
  | "leave"
  | "time"
  | "attendance"
  | "notifications"
  | "manager-support"
  | "labs"
  | "privacy"
  | "data-privacy"
  | "plan"
  | "plan-limits";

const TAB_KEY_TO_CONTENT_TAB: Record<SettingsTabKey, SettingsContentTab> = {
  general: "General",
  workspace: "Workspace",
  locations: "Locations & teams",
  teams: "Locations & teams",
  roles: "Roles & permissions",
  permissions: "Roles & permissions",
  rota: "Rota & scheduling",
  scheduling: "Rota & scheduling",
  leave: "Leave",
  time: "Time & attendance",
  attendance: "Time & attendance",
  notifications: "Notifications",
  "manager-support": "Manager support",
  labs: "Labs",
  privacy: "Data & privacy",
  "data-privacy": "Data & privacy",
  plan: "Plan & limits",
  "plan-limits": "Plan & limits",
};

export interface SettingsSearch {
  tab?: SettingsTabKey;
}

export const DEFAULT_SETTINGS_TAB: SettingsContentTab = "General";

export function parseSettingsSearch(search: Record<string, unknown>): SettingsSearch {
  const tab = typeof search.tab === "string" ? search.tab : undefined;
  if (tab && tab in TAB_KEY_TO_CONTENT_TAB) {
    return { tab: tab as SettingsTabKey };
  }
  return {};
}

/** Resolves a validated search value to the internal Settings tab label. */
export function resolveSettingsSearchTab(search: SettingsSearch): SettingsContentTab | undefined {
  return search.tab ? TAB_KEY_TO_CONTENT_TAB[search.tab] : undefined;
}
