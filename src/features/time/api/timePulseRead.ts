import { createServerFn } from "@tanstack/react-start";
import { buildTimePulse } from "../lib/timePulse";
import { isOnLocalDate, localDateOf, shiftTouchesLocalDate } from "../lib/timePulseFormat";
import type { TimePulseEntryInput, TimePulseRow, TimePulseShiftInput } from "../lib/timePulseTypes";
import {
  latestSnapshotIdsByWeek,
  type PulseShiftRow,
  type PulseSnapshotRow,
} from "./timePulseSnapshots";

/**
 * Time Pulse — read-only live attendance for the whole workspace.
 *
 * READ ONLY. No insert, update, upsert or RPC: it selects rows an owner/manager
 * can already read (published shifts, their own workspace's time entries and
 * clock events) with every query scoped by a `workspace_id` resolved
 * server-side from the caller's session. It adds no table, policy, grant or
 * write authority, and it persists nothing it derives.
 *
 * Explicitly NOT scoped to one location. The rota page reads a single location
 * at a time because a manager is editing one week at one venue; an attendance
 * board answering "who should be here right now" must cover every active
 * location, or a multi-venue workspace would silently see only the first one.
 * Each row keeps its own location and timezone so the labels stay local-correct.
 */

const SHIFT_WINDOW_HOURS = 48;

export interface TimePulseResult {
  rows: TimePulseRow[];
  /** Active locations covered by this read, for honest empty-state copy. */
  locationCount: number;
  /** When this snapshot of attendance was taken, for the freshness line. */
  generatedAt: string;
  /**
   * Timezone for the freshness line. Rows carry their own venue timezone; the
   * "as at" time is a single workspace-level fact, so it uses the workspace's.
   */
  workspaceTimezone: string;
}

interface LocationRow {
  id: string;
  name: string;
  timezone: string | null;
  status: string;
}

interface EntryRow {
  id: string;
  staff_member_id: string;
  shift_id: string | null;
  scheduled_start_at: string | null;
  scheduled_end_at: string | null;
  clocked_in_at: string | null;
  clocked_out_at: string | null;
}

interface StaffRow {
  id: string;
  display_name: string;
  role_name: string;
  primary_location_id: string | null;
}

function isoDaysFromNow(now: Date, days: number): string {
  return new Date(now.getTime() + days * 86_400_000).toISOString().slice(0, 10);
}

export const fetchTimePulseFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<TimePulseResult> => {
    const { getSupabaseServerClient } = await import("@/lib/supabase/serverClient");
    const { requireActiveManagerWorkspaceId } =
      await import("@/features/auth/api/activeManagerWorkspace");
    const supabase = getSupabaseServerClient();
    const workspaceId = await requireActiveManagerWorkspaceId(supabase);
    const now = new Date();

    const [locationResult, workspaceResult] = await Promise.all([
      supabase
        .from("locations")
        .select("id, name, timezone, status")
        .eq("workspace_id", workspaceId),
      supabase.from("workspaces").select("timezone").eq("id", workspaceId).single(),
    ]);
    if (locationResult.error) throw locationResult.error;
    if (workspaceResult.error) throw workspaceResult.error;

    const workspaceTimezone =
      (workspaceResult.data as { timezone: string | null }).timezone ?? "UTC";
    const allLocations = (locationResult.data as LocationRow[] | null) ?? [];
    const activeLocations = allLocations.filter((row) => row.status === "active");
    const locationById = new Map(
      allLocations.map((row) => [
        row.id,
        { name: row.name, timezone: row.timezone ?? workspaceTimezone },
      ]),
    );
    const activeLocationIds = new Set(activeLocations.map((row) => row.id));

    // A generous absolute window keeps the query bounded while remaining wide
    // enough for every timezone offset plus an overnight shift; the exact
    // local-day test happens below, per location.
    const windowStart = new Date(now.getTime() - SHIFT_WINDOW_HOURS * 3_600_000).toISOString();
    const windowEnd = new Date(now.getTime() + SHIFT_WINDOW_HOURS * 3_600_000).toISOString();

    const [publishedResult, entryResult] = await Promise.all([
      supabase
        .from("published_rota_shifts")
        .select(
          "source_shift_id, snapshot_id, staff_member_id, location_id, starts_at, ends_at, role_name, assignment_status",
        )
        .eq("workspace_id", workspaceId)
        .eq("assignment_status", "scheduled")
        .gte("starts_at", windowStart)
        .lte("starts_at", windowEnd),
      supabase
        .from("time_entries")
        .select(
          "id, staff_member_id, shift_id, scheduled_start_at, scheduled_end_at, clocked_in_at, clocked_out_at",
        )
        .eq("workspace_id", workspaceId)
        .gte("work_date", isoDaysFromNow(now, -2))
        .lte("work_date", isoDaysFromNow(now, 2)),
    ]);
    if (publishedResult.error) throw publishedResult.error;
    if (entryResult.error) throw entryResult.error;

    const publishedRows = (publishedResult.data as PulseShiftRow[] | null) ?? [];
    const snapshotIds = [...new Set(publishedRows.map((row) => row.snapshot_id))];
    const snapshotResult = snapshotIds.length
      ? await supabase
          .from("published_rota_snapshots")
          .select("id, rota_week_id, version, published_at")
          .eq("workspace_id", workspaceId)
          .in("id", snapshotIds)
      : { data: [], error: null };
    if (snapshotResult.error) throw snapshotResult.error;

    // Only the newest snapshot of each rota week is operative; older versions
    // would otherwise duplicate a shift or resurrect a withdrawn one.
    const liveSnapshotIds = latestSnapshotIdsByWeek(
      (snapshotResult.data as PulseSnapshotRow[] | null) ?? [],
    );

    const shifts: TimePulseShiftInput[] = [];
    for (const row of publishedRows) {
      if (!liveSnapshotIds.has(row.snapshot_id)) continue;
      if (!activeLocationIds.has(row.location_id)) continue;
      if (row.staff_member_id === null) continue;
      const location = locationById.get(row.location_id);
      if (!location) continue;
      const shift: TimePulseShiftInput = {
        sourceShiftId: row.source_shift_id,
        staffMemberId: row.staff_member_id,
        staffName: "Team member",
        roleName: row.role_name,
        locationId: row.location_id,
        locationName: location.name,
        timezone: location.timezone,
        startsAt: row.starts_at,
        endsAt: row.ends_at,
      };
      // Each location decides its own "today", so a venue an hour ahead does
      // not inherit another venue's day boundary.
      if (!shiftTouchesLocalDate(shift, localDateOf(now, location.timezone))) continue;
      shifts.push(shift);
    }

    const entryRows = (entryResult.data as EntryRow[] | null) ?? [];
    const openEntryIds = entryRows
      .filter((row) => row.clocked_in_at !== null && row.clocked_out_at === null)
      .map((row) => row.id);
    const { readOpenBreakEntryIds } = await import("./timePulseBreaks");
    const openBreakIds = await readOpenBreakEntryIds(supabase, workspaceId, openEntryIds);

    const entries: TimePulseEntryInput[] = entryRows.map((row) => ({
      id: row.id,
      staffMemberId: row.staff_member_id,
      shiftId: row.shift_id,
      scheduledStartAt: row.scheduled_start_at,
      scheduledEndAt: row.scheduled_end_at,
      clockedInAt: row.clocked_in_at,
      clockedOutAt: row.clocked_out_at,
      onOpenBreak: openBreakIds.has(row.id),
    }));

    const staffIds = [
      ...new Set([
        ...shifts.map((shift) => shift.staffMemberId),
        ...entries.map((entry) => entry.staffMemberId),
      ]),
    ];
    const staffResult = staffIds.length
      ? await supabase
          .from("staff_members")
          .select("id, display_name, role_name, primary_location_id")
          .eq("workspace_id", workspaceId)
          .in("id", staffIds)
      : { data: [], error: null };
    if (staffResult.error) throw staffResult.error;
    const staffRows = (staffResult.data as StaffRow[] | null) ?? [];
    const staffNames = new Map(staffRows.map((row) => [row.id, row.display_name]));
    const staffLocations = new Map(
      staffRows.flatMap((row) => {
        const location = row.primary_location_id
          ? locationById.get(row.primary_location_id)
          : undefined;
        return location
          ? [
              [
                row.id,
                {
                  locationId: row.primary_location_id!,
                  locationName: location.name,
                  timezone: location.timezone,
                },
              ] as const,
            ]
          : [];
      }),
    );

    for (const shift of shifts) {
      shift.staffName = staffNames.get(shift.staffMemberId) ?? "Team member";
    }

    // The authoritative set of shifts on today's board, after snapshot,
    // location and local-date resolution.
    const todaysShiftIds = new Set(shifts.map((shift) => shift.sourceShiftId));

    const relevantEntries = entries.filter((entry) => {
      // A shift-linked entry belongs to exactly one published shift. If that
      // shift is not on today's board — because it was yesterday's, or a
      // republish replaced or removed it, or its location is no longer active —
      // the entry is simply not today's business. It is dropped outright and
      // never reinterpreted as unscheduled attendance, which would state
      // something false about a shift that was properly scheduled.
      if (entry.shiftId !== null) return todaysShiftIds.has(entry.shiftId);

      // Genuinely unscheduled attendance: no shift at all. Counted only when
      // the clock-in is really today somewhere in the workspace, so a stale
      // open entry from a previous day cannot pose as someone on site now.
      if (entry.clockedInAt === null) return false;
      const timezone = staffLocations.get(entry.staffMemberId)?.timezone ?? workspaceTimezone;
      return (
        isOnLocalDate(entry.clockedInAt, localDateOf(now, timezone), timezone) ||
        // A still-open session from before today is someone who is on site now.
        (entry.clockedOutAt === null && Date.parse(entry.clockedInAt) <= now.getTime())
      );
    });

    return {
      rows: buildTimePulse({
        shifts,
        entries: relevantEntries,
        now,
        fallbackTimezone: workspaceTimezone,
        staffNames,
        staffLocations,
      }),
      locationCount: activeLocations.length,
      generatedAt: now.toISOString(),
      workspaceTimezone,
    };
  },
);
