import type { SupabaseClient } from "@supabase/supabase-js";
import { hasIncompleteBreak, type BreakEventLike } from "../lib/timeExceptions";

interface BreakEventRow {
  id: string;
  time_entry_id: string;
  event_type: "break_start" | "break_end";
  occurred_at: string;
}

/**
 * Lightweight list/filter fact for only the entries in the bounded time read.
 * Full clock-event evidence (including source), time-entry events, and audit
 * details remain drawer-lazy.
 */
export async function readIncompleteBreakEntryIds(
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

  const byEntry = new Map<string, BreakEventLike[]>();
  for (const row of (data as BreakEventRow[] | null) ?? []) {
    const events = byEntry.get(row.time_entry_id) ?? [];
    events.push({ id: row.id, eventType: row.event_type, occurredAt: row.occurred_at });
    byEntry.set(row.time_entry_id, events);
  }
  return new Set(
    [...byEntry.entries()]
      .filter(([, events]) => hasIncompleteBreak(events))
      .map(([timeEntryId]) => timeEntryId),
  );
}
