import type { OpsEntry, OpsPageData } from "../types";

export function updateOpsEntrySnapshot(
  page: OpsPageData,
  entryId: string,
  change: Partial<OpsEntry>,
): OpsPageData {
  const update = (entry: OpsEntry) => (entry.id === entryId ? { ...entry, ...change } : entry);
  return {
    ...page,
    entries: page.entries.map(update),
    selectedEntry: page.selectedEntry ? update(page.selectedEntry) : null,
  };
}
