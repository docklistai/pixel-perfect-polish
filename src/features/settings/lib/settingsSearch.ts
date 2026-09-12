import type { SettingsContentTab } from "../components/SettingsContent";

/**
 * Stable, addressable Settings tabs. Deliberately small: only a tab that
 * needs a deep link from outside Settings gets a key here — this is not a
 * mirror of every entry in settingsTabs, and the key must never be a display
 * label (labels can change; this URL contract must not).
 */
export type SettingsTabKey = "workspace";

const TAB_KEY_TO_CONTENT_TAB: Record<SettingsTabKey, SettingsContentTab> = {
  workspace: "Workspace",
};

export interface SettingsSearch {
  tab?: SettingsTabKey;
}

export const DEFAULT_SETTINGS_TAB: SettingsContentTab = "General";

export function parseSettingsSearch(search: Record<string, unknown>): SettingsSearch {
  return search.tab === "workspace" ? { tab: "workspace" } : {};
}

/** Resolves a validated search value to the internal Settings tab label. */
export function resolveSettingsSearchTab(search: SettingsSearch): SettingsContentTab | undefined {
  return search.tab ? TAB_KEY_TO_CONTENT_TAB[search.tab] : undefined;
}
