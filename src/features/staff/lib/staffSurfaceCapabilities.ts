export function getStaffSurfaceCapabilities(source: "live" | "demo") {
  const isDemo = source === "demo";

  return {
    showDemoBulkActions: isDemo,
    showDemoRowActions: isDemo,
    canIssueAccessCodes: !isDemo,
  };
}

/** Every section the compact staff panel can show. */
export const STAFF_PANEL_TABS = ["Overview", "Documents", "Notes"] as const;

export type StaffPanelTab = (typeof STAFF_PANEL_TABS)[number];

/**
 * The panel sections a roster row actually offers.
 *
 * Documents and Notes have no live source during the supervised pilot — the
 * same reason they are absent from `LIVE_PROFILE_TABS` on the full profile. A
 * tab that can only ever say "not connected yet" is worse than an absent one.
 * Both stay for the demo roster, which has fixtures behind them.
 */
export function getStaffPanelTabs(source: "live" | "demo"): readonly StaffPanelTab[] {
  return source === "live" ? ["Overview"] : STAFF_PANEL_TABS;
}

export function getCompactLiveProfileEmptyCopy(tab: "documents" | "notes"): string {
  return tab === "documents"
    ? "Document storage is not connected yet."
    : "Manager notes are not connected yet.";
}
