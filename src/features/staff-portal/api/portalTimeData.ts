import { getSupabaseBrowserClient } from "@/lib/supabase/browserClient";
import type { ClockEntry } from "../types";
import { formatDayLabel, formatTime } from "./portalFormatting";

export interface PortalTimeEntry extends ClockEntry {
  clockedInAtMs: number | null;
  clockedOutAtMs: number | null;
}

interface TimeEntryViewRow {
  time_entry_id: string;
  staff_member_id: string;
  work_date: string;
  clocked_in_at: string | null;
  clocked_out_at: string | null;
  break_minutes: number;
}

function mapPortalTimeEntry(row: TimeEntryViewRow, timezone: string): PortalTimeEntry {
  const clockedInAtMs = row.clocked_in_at ? Date.parse(row.clocked_in_at) : null;
  const clockedOutAtMs = row.clocked_out_at ? Date.parse(row.clocked_out_at) : null;
  const workedMinutes =
    clockedInAtMs !== null && clockedOutAtMs !== null
      ? Math.max(0, Math.floor((clockedOutAtMs - clockedInAtMs) / 60_000) - row.break_minutes)
      : null;
  return {
    id: row.time_entry_id,
    dayLabel: formatDayLabel(row.work_date),
    clockIn: row.clocked_in_at ? formatTime(row.clocked_in_at, timezone) : "—",
    clockOut: row.clocked_out_at ? formatTime(row.clocked_out_at, timezone) : null,
    breakMinutes: row.break_minutes,
    totalHours: workedMinutes !== null ? Math.round((workedMinutes / 60) * 10) / 10 : null,
    flag: clockedInAtMs !== null && clockedOutAtMs === null ? "missing-clock-out" : null,
    clockedInAtMs,
    clockedOutAtMs,
  };
}

export async function fetchPortalTimeEntries(
  workspaceId: string,
  staffMemberId: string,
  timezone: string,
): Promise<PortalTimeEntry[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("staff_portal_time_entries")
    .select(
      "time_entry_id, staff_member_id, work_date, clocked_in_at, clocked_out_at, break_minutes",
    )
    .eq("workspace_id", workspaceId)
    .eq("staff_member_id", staffMemberId)
    .order("work_date", { ascending: false })
    .order("clocked_in_at", { ascending: false, nullsFirst: false });

  if (error) throw error;
  return ((data as TimeEntryViewRow[] | null) ?? []).map((row) =>
    mapPortalTimeEntry(row, timezone),
  );
}

export type PortalClockEventType = "clock_in" | "clock_out" | "break_start" | "break_end";

export interface PortalClockEvent {
  timeEntryId: string;
  eventType: PortalClockEventType;
  occurredAtMs: number;
}

interface ClockEventViewRow {
  time_entry_id: string;
  event_type: PortalClockEventType;
  occurred_at: string;
}

export async function fetchPortalClockEvents(
  workspaceId: string,
  staffMemberId: string,
): Promise<PortalClockEvent[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("staff_portal_clock_events")
    .select("time_entry_id, event_type, occurred_at")
    .eq("workspace_id", workspaceId)
    .eq("staff_member_id", staffMemberId)
    .order("occurred_at", { ascending: false })
    .limit(200);

  if (error) throw error;
  return ((data as ClockEventViewRow[] | null) ?? []).map((row) => ({
    timeEntryId: row.time_entry_id,
    eventType: row.event_type,
    occurredAtMs: Date.parse(row.occurred_at),
  }));
}
