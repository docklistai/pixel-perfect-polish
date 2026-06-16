import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { DraftShift, ShiftTone } from "../types";
import {
  dateIsoInTimezone,
  dayIndexFromDates,
  formatTimeInTimezone,
  weekStartForOffset,
} from "../lib/liveRotaDates";

/**
 * Manager-side live rota reads. Runs as a server function bound to the caller's
 * session cookie. The active manager workspace is resolved server-side and used
 * for every query; workspace RLS remains backup tenant enforcement.
 *
 * Read-only by design: nothing here writes a shift, week, or snapshot, and there
 * is no service-role key. The live `shifts` table is the manager's working draft,
 * so these rows are mapped into the grid's `DraftShift` shape and the existing
 * rota grid renders unchanged. Times are rendered in the selected location timezone so
 * the HH:MM labels and weekday column line up with the demo grid.
 */

const rotaWeekInput = z.object({
  weekOffset: z.number().int().min(-260).max(260),
  locationId: z.string().uuid().optional(),
});

export type LiveWeekStatus = "draft" | "published" | "archived";
export type LiveRotaLocation = { id: string; name: string };

export type LiveRotaWeek = {
  /** True when a rota_weeks row exists for this workspace + week_start. */
  hasWeek: boolean;
  rotaWeekId: string | null;
  status: LiveWeekStatus | null;
  hasPublishedSnapshot: boolean;
  hasUnpublishedChanges: boolean;
  weekStart: string;
  locationId: string;
  locationName: string;
  locations: LiveRotaLocation[];
  today: string;
  shifts: DraftShift[];
};

interface LocationRow extends LiveRotaLocation {
  timezone: string;
}

interface ShiftRow {
  id: string;
  staff_member_id: string | null;
  shift_date: string;
  starts_at: string;
  ends_at: string;
  break_minutes: number;
  role_name: string;
  assignment_status: "scheduled" | "open";
  created_at: string;
  updated_at: string;
}

interface WeekRow {
  id: string;
  status: LiveWeekStatus;
  updated_at: string;
}

interface SnapshotRow {
  published_at: string;
}

function mapShift(row: ShiftRow, weekStartIso: string, timezone: string): DraftShift {
  const isOpen = row.assignment_status === "open";
  const tone: ShiftTone = isOpen ? "open" : "info";
  return {
    id: row.id,
    dayIndex: dayIndexFromDates(weekStartIso, row.shift_date),
    staffId: row.staff_member_id,
    role: row.role_name,
    start: formatTimeInTimezone(row.starts_at, timezone),
    end: formatTimeInTimezone(row.ends_at, timezone),
    breakMinutes: row.break_minutes,
    tone,
    status: isOpen ? "open" : "scheduled",
  };
}

function latestShiftChangeAt(shifts: ShiftRow[], weekUpdatedAt: string): string {
  return shifts.reduce((latest, shift) => {
    const shiftLatest = shift.updated_at > shift.created_at ? shift.updated_at : shift.created_at;
    return shiftLatest > latest ? shiftLatest : latest;
  }, weekUpdatedAt);
}

function timestampValue(value: string): number {
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function hasDraftChangedSincePublish(
  week: WeekRow,
  shifts: ShiftRow[],
  latestSnapshot: SnapshotRow | null,
): boolean {
  if (!latestSnapshot) return false;
  if (week.status !== "published") return true;
  return (
    timestampValue(latestShiftChangeAt(shifts, week.updated_at)) >
    timestampValue(latestSnapshot.published_at)
  );
}

/**
 * The manager's live draft shifts for one week. Returns `hasWeek: false` (and an
 * empty shift list) when no rota_weeks row exists for that week, so the caller can
 * show an honest empty live week rather than falling back to the demo seed.
 */
export const fetchWorkspaceRotaWeekFn = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => rotaWeekInput.parse(input))
  .handler(async ({ data }): Promise<LiveRotaWeek> => {
    const { getSupabaseServerClient } = await import("@/lib/supabase/serverClient");
    const { requireActiveManagerWorkspaceId } =
      await import("@/features/auth/api/activeManagerWorkspace");
    const supabase = getSupabaseServerClient();
    const workspaceId = await requireActiveManagerWorkspaceId(supabase);

    const { data: locationsData, error: locationsError } = await supabase
      .from("locations")
      .select("id, name, timezone")
      .eq("workspace_id", workspaceId)
      .eq("status", "active")
      .order("name", { ascending: true })
      .order("id", { ascending: true });

    if (locationsError) throw locationsError;

    const locations = (locationsData as LocationRow[] | null) ?? [];
    const location =
      (data.locationId && locations.find((row) => row.id === data.locationId)) || locations[0];
    if (!location) throw new Error("No active rota location is available");

    const weekStart = weekStartForOffset(location.timezone, data.weekOffset);

    const { data: week, error: weekError } = await supabase
      .from("rota_weeks")
      .select("id, status, updated_at")
      .eq("workspace_id", workspaceId)
      .eq("location_id", location.id)
      .eq("week_start", weekStart)
      .maybeSingle();

    if (weekError) throw weekError;

    const resultBase = {
      weekStart,
      locationId: location.id,
      locationName: location.name,
      locations: locations.map(({ id, name }) => ({ id, name })),
      today: dateIsoInTimezone(new Date(), location.timezone),
    };
    if (!week) {
      return {
        ...resultBase,
        hasWeek: false,
        rotaWeekId: null,
        status: null,
        hasPublishedSnapshot: false,
        hasUnpublishedChanges: false,
        shifts: [],
      };
    }

    const [{ data: shifts, error: shiftsError }, { data: latestSnapshot, error: snapshotError }] =
      await Promise.all([
        supabase
          .from("shifts")
          .select(
            "id, staff_member_id, shift_date, starts_at, ends_at, break_minutes, role_name, assignment_status, created_at, updated_at",
          )
          .eq("workspace_id", workspaceId)
          .eq("rota_week_id", week.id)
          .order("shift_date", { ascending: true })
          .order("starts_at", { ascending: true }),
        supabase
          .from("published_rota_snapshots")
          .select("published_at")
          .eq("workspace_id", workspaceId)
          .eq("rota_week_id", week.id)
          .order("version", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

    if (shiftsError) throw shiftsError;
    if (snapshotError) throw snapshotError;

    const shiftRows = (shifts as ShiftRow[] | null) ?? [];
    const weekRow = week as WeekRow;
    const snapshotRow = (latestSnapshot as SnapshotRow | null) ?? null;

    return {
      ...resultBase,
      hasWeek: true,
      rotaWeekId: weekRow.id,
      status: weekRow.status,
      hasPublishedSnapshot: Boolean(snapshotRow),
      hasUnpublishedChanges: hasDraftChangedSincePublish(weekRow, shiftRows, snapshotRow),
      shifts: shiftRows.map((row) => mapShift(row, weekStart, location.timezone)),
    };
  });
