import type { SupabaseClient } from "@supabase/supabase-js";

interface BreakEventRow {
  id: string;
  time_entry_id: string;
  event_type: "break_start" | "break_end";
  occurred_at: string;
}

/**
 * Entries whose break is open right now.
 *
 * Distinct from `readIncompleteBreakEntryIds`, which answers a review question
 * ("did this finished shift have a malformed break?"). Time Pulse asks a live
 * question ("is this person on break at this moment?"), so an unmatched
 * `break_start` at the end of the sequence is the signal, not an anomaly.
 */
export async function readOpenBreakEntryIds(
  supabase: SupabaseClient,
  workspaceId: string,
  timeEntryIds: string[],
): Promise<Set<string>> {
  if (timeEntryIds.length === 0) return new Set();
  const { data, error } = await supabase
    .from("clock_events")
    .select("id, time_entry_id, event_type, occurred_at")
    .eq("workspace_id", workspaceId)
    .in("time_entry_id", timeEntryIds)
    .in("event_type", ["break_start", "break_end"])
    .order("occurred_at", { ascending: true })
    .order("id", { ascending: true });
  if (error) throw error;

  const openByEntry = new Map<string, boolean>();
  for (const row of (data as BreakEventRow[] | null) ?? []) {
    openByEntry.set(row.time_entry_id, row.event_type === "break_start");
  }
  return new Set(
    [...openByEntry.entries()].filter(([, isOpen]) => isOpen).map(([entryId]) => entryId),
  );
}
