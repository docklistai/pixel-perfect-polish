import {
  demandFromCurrentWeek,
  demandFromPreviousWeek,
  demandFromTemplate,
} from "../lib/scheduling/demandSources";
import { signatureKey } from "../lib/scheduling/shiftSignature";
import type { DemandRequirement, ExistingShiftFact } from "../lib/scheduling/buildWeekProposal";
import { formatTimeInTimezone, liveWeekLabel } from "../lib/liveRotaDates";
import {
  chooseRecentPatternWeek,
  patternWeekStarts,
  PATTERN_LOOKBACK_WEEKS,
  type PatternWeekCandidate,
} from "../lib/scheduling/recentPatternWeek";
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

export const NO_RECENT_PATTERN_REASON = `No rota in the last ${PATTERN_LOOKBACK_WEEKS} weeks has any shifts, so there is no pattern to take a shape from.`;

/**
 * The nearest earlier week that actually has shifts, within the lookback window.
 *
 * Shared deliberately: the source step asks this to decide whether to offer the
 * option at all, and the proposal asks it again to build from. One implementation
 * means the week a manager is told about is the week they get.
 *
 * Two reads, not one per candidate week: the weeks that exist, then the shifts
 * belonging to them.
 */
export async function findRecentPatternWeek({
  supabase,
  workspaceId,
  locationId,
  weekStart,
}: {
  supabase: SupabaseClientLike;
  workspaceId: string;
  locationId: string;
  weekStart: string;
}): Promise<PatternWeekCandidate | null> {
  const wanted = patternWeekStarts(weekStart);
  const { data: weekRows, error: weekError } = await supabase
    .from("rota_weeks")
    .select("id, week_start")
    .eq("workspace_id", workspaceId)
    .eq("location_id", locationId)
    .in(
      "week_start",
      wanted.map((entry) => entry.weekStart),
    );
  if (weekError) throw weekError;

  const weeks = (weekRows as { id: string; week_start: string }[] | null) ?? [];
  if (weeks.length === 0) return null;

  const { data: shiftRows, error: shiftError } = await supabase
    .from("shifts")
    .select("rota_week_id")
    .eq("workspace_id", workspaceId)
    .in(
      "rota_week_id",
      weeks.map((week) => week.id),
    );
  if (shiftError) throw shiftError;

  const countByWeekId = new Map<string, number>();
  for (const row of (shiftRows as { rota_week_id: string }[] | null) ?? []) {
    countByWeekId.set(row.rota_week_id, (countByWeekId.get(row.rota_week_id) ?? 0) + 1);
  }

  const weeksBackByStart = new Map(wanted.map((entry) => [entry.weekStart, entry.weeksBack]));
  const candidates: PatternWeekCandidate[] = weeks.flatMap((week) => {
    const weeksBack = weeksBackByStart.get(week.week_start);
    if (weeksBack === undefined) return [];
    return [
      {
        rotaWeekId: week.id,
        weekStart: week.week_start,
        weeksBack,
        shiftCount: countByWeekId.get(week.id) ?? 0,
      },
    ];
  });

  return chooseRecentPatternWeek(candidates);
}

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
  const patternWeek = await findRecentPatternWeek({
    supabase,
    workspaceId,
    locationId,
    weekStart,
  });
  if (!patternWeek) return { ok: false, message: NO_RECENT_PATTERN_REASON };

  const { data: previousShifts, error: shiftsError } = await supabase
    .from("shifts")
    .select(SHIFT_COLUMNS)
    .eq("workspace_id", workspaceId)
    .eq("rota_week_id", patternWeek.rotaWeekId)
    .order("id", { ascending: true });
  if (shiftsError) throw shiftsError;

  const rows = (previousShifts as ShiftRow[] | null) ?? [];
  // The count came from the same rows a moment ago, so an empty read here means
  // the week was cleared in between rather than that the search was wrong.
  if (rows.length === 0) return { ok: false, message: NO_RECENT_PATTERN_REASON };

  // Shape only — who worked it is decided again against this week's leave.
  const pattern = rows.map((row) => ({
    dayOffset: Math.round(
      (Date.parse(`${row.shift_date}T12:00:00Z`) -
        Date.parse(`${patternWeek.weekStart}T12:00:00Z`)) /
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
      id: patternWeek.rotaWeekId,
      // Names the week it actually came from. With the search looking back up to
      // four weeks, "last week" would sometimes be a lie.
      label: `Staffing pattern from ${liveWeekLabel(patternWeek.weekStart)}`,
    },
    // The week is part of the identity: picking a different source week must
    // invalidate a proposal issued from the old one.
    contentVersion: `week:${patternWeek.weekStart}|shifts:${rows.length}`,
  };
}
