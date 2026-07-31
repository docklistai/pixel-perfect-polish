import {
  demandFromCurrentWeek,
  demandFromPreviousWeek,
  demandFromTemplate,
} from "../lib/scheduling/demandSources";
import { signatureKey } from "../lib/scheduling/shiftSignature";
import type { DemandRequirement, ExistingShiftFact } from "../lib/scheduling/buildWeekProposal";
import { addIsoDays, formatTimeInTimezone } from "../lib/liveRotaDates";
import { SHIFT_COLUMNS, type ShiftRow, type SupabaseClientLike } from "./buildWeekFacts";

/**
 * Reading one chosen demand source into counted requirements.
 *
 * Each source is read differently and they all produce the same thing, so the
 * planner has exactly one notion of demand. Nothing here decides who works —
 * these are shapes and counts only, deliberately discarding last week's
 * assignments so this week is planned against this week's leave.
 */

export type BuildWeekSourceInput =
  | { kind: "template"; templateId: string }
  | { kind: "previous-week-pattern" }
  | { kind: "current-week" };

export type ResolvedDemand =
  | {
      ok: true;
      demand: DemandRequirement[];
      source: {
        kind: "template" | "previous-week-pattern" | "current-week";
        id?: string;
        label: string;
      };
      /** Feeds the fingerprint, so changing the source's content invalidates a proposal. */
      contentVersion: string;
    }
  | { ok: false; message: string };

interface SlotRow {
  weekday: number;
  role_name: string;
  department_id: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
  quantity: number;
}

export async function resolveDemand({
  supabase,
  workspaceId,
  source,
  dayIsoDates,
  locationId,
  weekStart,
  existingShifts,
  existingRows,
  timezone,
}: {
  supabase: SupabaseClientLike;
  workspaceId: string;
  source: BuildWeekSourceInput;
  dayIsoDates: string[];
  locationId: string;
  weekStart: string;
  existingShifts: ExistingShiftFact[];
  existingRows: ShiftRow[];
  timezone: string;
}): Promise<ResolvedDemand> {
  if (source.kind === "current-week") {
    const roleNameByKey = new Map(
      existingRows.map((row, index) => [
        signatureKey(existingShifts[index]!.signature),
        row.role_name,
      ]),
    );
    return {
      ok: true,
      demand: demandFromCurrentWeek(existingShifts, roleNameByKey),
      source: { kind: "current-week", label: "This week's existing shifts" },
      contentVersion: "derived-from-week",
    };
  }

  if (source.kind === "template")
    return resolveTemplate(supabase, workspaceId, source.templateId, dayIsoDates, locationId);

  return resolvePreviousWeek(supabase, workspaceId, weekStart, locationId, dayIsoDates, timezone);
}

async function resolveTemplate(
  supabase: SupabaseClientLike,
  workspaceId: string,
  templateId: string,
  dayIsoDates: string[],
  locationId: string,
): Promise<ResolvedDemand> {
  const [templateRes, slotsRes] = await Promise.all([
    supabase
      .from("rota_demand_templates")
      .select("id, name")
      .eq("workspace_id", workspaceId)
      .eq("id", templateId)
      .maybeSingle(),
    supabase
      .from("rota_demand_template_slots")
      .select("weekday, role_name, department_id, start_time, end_time, break_minutes, quantity")
      .eq("workspace_id", workspaceId)
      .eq("template_id", templateId)
      .order("weekday", { ascending: true }),
  ]);
  if (templateRes.error) throw templateRes.error;
  if (slotsRes.error) throw slotsRes.error;
  const template = templateRes.data as { id: string; name: string } | null;
  if (!template) return { ok: false, message: "That template no longer exists." };

  const slots = ((slotsRes.data as SlotRow[] | null) ?? []).map((slot) => ({
    weekday: slot.weekday,
    roleName: slot.role_name,
    departmentId: slot.department_id,
    startLocal: slot.start_time.slice(0, 5),
    endLocal: slot.end_time.slice(0, 5),
    breakMinutes: slot.break_minutes,
    quantity: slot.quantity,
  }));
  if (slots.length === 0) {
    return { ok: false, message: "That template has no shifts in it yet." };
  }
  return {
    ok: true,
    demand: demandFromTemplate(slots, dayIsoDates, locationId),
    source: { kind: "template", id: template.id, label: template.name },
    contentVersion: `slots:${slots.length}`,
  };
}

async function resolvePreviousWeek(
  supabase: SupabaseClientLike,
  workspaceId: string,
  weekStart: string,
  locationId: string,
  dayIsoDates: string[],
  timezone: string,
): Promise<ResolvedDemand> {
  const previousWeekStart = addIsoDays(weekStart, -7);
  const { data: previousWeek, error: weekError } = await supabase
    .from("rota_weeks")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("location_id", locationId)
    .eq("week_start", previousWeekStart)
    .maybeSingle();
  if (weekError) throw weekError;
  if (!previousWeek) {
    return { ok: false, message: "There is no previous week here to take a pattern from." };
  }

  const { data: previousShifts, error: shiftsError } = await supabase
    .from("shifts")
    .select(SHIFT_COLUMNS)
    .eq("workspace_id", workspaceId)
    .eq("rota_week_id", (previousWeek as { id: string }).id)
    .order("id", { ascending: true });
  if (shiftsError) throw shiftsError;

  const rows = (previousShifts as ShiftRow[] | null) ?? [];
  if (rows.length === 0) {
    return { ok: false, message: "The previous week has no shifts to take a pattern from." };
  }

  // Shape only — who worked last week is decided again against this week's leave.
  const pattern = rows.map((row) => ({
    dayOffset: Math.round(
      (Date.parse(`${row.shift_date}T12:00:00Z`) - Date.parse(`${previousWeekStart}T12:00:00Z`)) /
        86_400_000,
    ),
    roleName: row.role_name,
    departmentId: row.department_id,
    startLocal: formatTimeInTimezone(row.starts_at, timezone),
    endLocal: formatTimeInTimezone(row.ends_at, timezone),
    breakMinutes: row.break_minutes,
  }));

  return {
    ok: true,
    demand: demandFromPreviousWeek(pattern, dayIsoDates, locationId),
    source: {
      kind: "previous-week-pattern",
      id: (previousWeek as { id: string }).id,
      label: "Last week's staffing pattern",
    },
    contentVersion: `shifts:${rows.length}`,
  };
}
