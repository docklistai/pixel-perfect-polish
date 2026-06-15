import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { DraftShift, RotaDayIndex, ShiftTone } from "../types";

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
  status: LiveWeekStatus | null;
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
}

/** timestamptz → "HH:MM" in the selected location timezone (matches the demo grid). */
function formatTime(iso: string, timezone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

/** Whole-day offset of a shift date from the Monday week start. */
function dayIndexFromDates(weekStartIso: string, shiftDateIso: string): RotaDayIndex {
  const start = new Date(`${weekStartIso}T00:00:00Z`).getTime();
  const day = new Date(`${shiftDateIso}T00:00:00Z`).getTime();
  const diff = Math.round((day - start) / 86_400_000);
  if (diff < 0 || diff > 6) throw new Error("Shift date falls outside its rota week");
  return diff as RotaDayIndex;
}

function mapShift(row: ShiftRow, weekStartIso: string, timezone: string): DraftShift {
  const isOpen = row.assignment_status === "open";
  const tone: ShiftTone = isOpen ? "open" : "info";
  return {
    id: row.id,
    dayIndex: dayIndexFromDates(weekStartIso, row.shift_date),
    staffId: row.staff_member_id,
    role: row.role_name,
    start: formatTime(row.starts_at, timezone),
    end: formatTime(row.ends_at, timezone),
    breakMinutes: row.break_minutes,
    tone,
    status: isOpen ? "open" : "scheduled",
  };
}

function dateIsoInTimezone(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function weekStartForOffset(timezone: string, weekOffset: number): string {
  const today = dateIsoInTimezone(new Date(), timezone);
  const weekday = new Date(`${today}T12:00:00Z`).getUTCDay();
  const daysSinceMonday = weekday === 0 ? 6 : weekday - 1;
  return addDays(today, weekOffset * 7 - daysSinceMonday);
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
      .select("id, status")
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
    if (!week) return { ...resultBase, hasWeek: false, status: null, shifts: [] };

    const { data: shifts, error: shiftsError } = await supabase
      .from("shifts")
      .select(
        "id, staff_member_id, shift_date, starts_at, ends_at, break_minutes, role_name, assignment_status",
      )
      .eq("workspace_id", workspaceId)
      .eq("rota_week_id", week.id)
      .order("shift_date", { ascending: true })
      .order("starts_at", { ascending: true });

    if (shiftsError) throw shiftsError;

    return {
      ...resultBase,
      hasWeek: true,
      status: week.status as LiveWeekStatus,
      shifts: ((shifts as ShiftRow[] | null) ?? []).map((row) =>
        mapShift(row, weekStart, location.timezone),
      ),
    };
  });
