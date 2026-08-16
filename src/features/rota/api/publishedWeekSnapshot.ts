import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { RotaDayIndex } from "../types";
import type { PublishDiffShift } from "../lib/publishDiff";

/**
 * The latest published snapshot for one rota week, projected onto the shape the
 * publish change review compares against.
 *
 * READ ONLY. This adds no write path and no new authority: it selects rows the
 * manager can already read under `published_rota_shifts_staff_safe_select`
 * (which grants owners and managers the whole workspace), and every query is
 * scoped by `workspace_id` resolved server-side from the caller's session.
 *
 * It is deliberately NOT folded into `fetchWorkspaceRotaWeekFn`. That runs on
 * every week navigation and location switch; this is needed only when a manager
 * opens the publish dialog, so it stays a separate lazily-enabled query.
 */

export interface PublishedWeekSnapshot {
  /** Null when the week has never been published. */
  publishedAt: string | null;
  version: number | null;
  shifts: PublishDiffShift[];
}

interface SnapshotRow {
  id: string;
  version: number;
  published_at: string;
}

interface PublishedShiftRow {
  source_shift_id: string;
  staff_member_id: string | null;
  department_id: string;
  shift_date: string;
  starts_at: string;
  ends_at: string;
  break_minutes: number;
  role_name: string;
  assignment_status: "scheduled" | "open";
}

const inputSchema = z.object({ rotaWeekId: z.string().uuid() });

const EMPTY: PublishedWeekSnapshot = { publishedAt: null, version: null, shifts: [] };

export const fetchPublishedWeekSnapshotFn = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data }): Promise<PublishedWeekSnapshot> => {
    const { getSupabaseServerClient } = await import("@/lib/supabase/serverClient");
    const { requireActiveManagerWorkspaceId } =
      await import("@/features/auth/api/activeManagerWorkspace");
    const { dayIndexFromDates, formatTimeInTimezone } = await import("../lib/liveRotaDates");
    const supabase = getSupabaseServerClient();
    const workspaceId = await requireActiveManagerWorkspaceId(supabase);

    const [weekResult, snapshotResult] = await Promise.all([
      supabase
        .from("rota_weeks")
        .select("id, week_start, location_id")
        .eq("workspace_id", workspaceId)
        .eq("id", data.rotaWeekId)
        .maybeSingle(),
      supabase
        .from("published_rota_snapshots")
        .select("id, version, published_at")
        .eq("workspace_id", workspaceId)
        .eq("rota_week_id", data.rotaWeekId)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    if (weekResult.error) throw weekResult.error;
    if (snapshotResult.error) throw snapshotResult.error;

    const week = weekResult.data as { week_start: string; location_id: string } | null;
    const snapshot = (snapshotResult.data as SnapshotRow | null) ?? null;
    // Never published, or the week is gone: an empty snapshot is the honest
    // answer and the caller renders a first-publish review from it.
    if (!week || !snapshot) return EMPTY;

    const [shiftsResult, locationResult] = await Promise.all([
      supabase
        .from("published_rota_shifts")
        .select(
          "source_shift_id, staff_member_id, department_id, shift_date, starts_at, ends_at, break_minutes, role_name, assignment_status",
        )
        .eq("workspace_id", workspaceId)
        .eq("snapshot_id", snapshot.id)
        // Matches how draft shifts arrive from `fetchWorkspaceRotaWeekFn`, so
        // removed entries list chronologically rather than in row order.
        .order("shift_date", { ascending: true })
        .order("starts_at", { ascending: true }),
      supabase
        .from("locations")
        .select("id, timezone")
        .eq("workspace_id", workspaceId)
        .eq("id", week.location_id)
        .maybeSingle(),
    ]);
    if (shiftsResult.error) throw shiftsResult.error;
    if (locationResult.error) throw locationResult.error;

    const rows = (shiftsResult.data as PublishedShiftRow[] | null) ?? [];
    const timezone =
      (locationResult.data as { timezone: string | null } | null)?.timezone ?? "Europe/London";

    const staffIds = [
      ...new Set(rows.map((row) => row.staff_member_id).filter((id): id is string => id !== null)),
    ];
    const departmentIds = [...new Set(rows.map((row) => row.department_id))];
    const [staffResult, departmentResult] = await Promise.all([
      staffIds.length
        ? supabase
            .from("staff_members")
            .select("id, display_name")
            .eq("workspace_id", workspaceId)
            .in("id", staffIds)
        : Promise.resolve({ data: [], error: null }),
      departmentIds.length
        ? supabase
            .from("departments")
            .select("id, name")
            .eq("workspace_id", workspaceId)
            .in("id", departmentIds)
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (staffResult.error) throw staffResult.error;
    if (departmentResult.error) throw departmentResult.error;

    const staffNames = new Map(
      ((staffResult.data as { id: string; display_name: string }[] | null) ?? []).map((row) => [
        row.id,
        row.display_name,
      ]),
    );
    const departmentNames = new Map(
      ((departmentResult.data as { id: string; name: string }[] | null) ?? []).map((row) => [
        row.id,
        row.name,
      ]),
    );

    return {
      publishedAt: snapshot.published_at,
      version: snapshot.version,
      shifts: rows.map((row) => ({
        // The draft shift this row was published from — the identity the diff
        // matches on. Stable across republication.
        id: row.source_shift_id,
        dayIndex: dayIndexFromDates(week.week_start, row.shift_date) as RotaDayIndex,
        staffId: row.staff_member_id,
        staffName: row.staff_member_id ? (staffNames.get(row.staff_member_id) ?? null) : null,
        role: row.role_name,
        start: formatTimeInTimezone(row.starts_at, timezone),
        end: formatTimeInTimezone(row.ends_at, timezone),
        breakMinutes: row.break_minutes,
        departmentName: departmentNames.get(row.department_id) ?? null,
      })),
    };
  });
