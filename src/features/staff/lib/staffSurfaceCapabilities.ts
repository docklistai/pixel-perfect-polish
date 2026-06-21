export function getStaffSurfaceCapabilities(source: "live" | "demo") {
  const isDemo = source === "demo";

  return {
    showDemoBulkActions: isDemo,
    showDemoRowActions: isDemo,
    canIssueAccessCodes: !isDemo,
  };
}

export function getCompactLiveProfileEmptyCopy(tab: "documents" | "notes"): string {
  return tab === "documents"
    ? "Document storage is not connected yet."
    : "Manager notes are not connected yet.";
}
