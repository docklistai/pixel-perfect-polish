import type { SupabaseClient } from "@supabase/supabase-js";
import type { z } from "zod";
import { weekStartForOffset } from "../lib/liveRotaDates";
import { liveWeekInput } from "./rotaLiveMutationSchemas";

export interface LocationRow {
  id: string;
  timezone: string;
}

export interface RotaWeekRow {
  id: string;
  location_id: string;
  week_start: string;
  status: "draft" | "published" | "archived";
}

export interface LiveMutationContext {
  supabase: SupabaseClient;
  workspaceId: string;
  location: LocationRow;
  weekStart: string;
  week: RotaWeekRow | null;
}

export async function resolveWorkspace(supabase: SupabaseClient): Promise<string> {
  const { requireActiveManagerWorkspaceId } =
    await import("@/features/auth/api/activeManagerWorkspace");
  return requireActiveManagerWorkspaceId(supabase);
}

async function selectLocation(
  supabase: SupabaseClient,
  workspaceId: string,
  locationId?: string,
): Promise<LocationRow> {
  const query = supabase
    .from("locations")
    .select("id, timezone")
    .eq("workspace_id", workspaceId)
    .eq("status", "active");
  const result = locationId
    ? await query.eq("id", locationId).maybeSingle()
    : await query
        .order("name", { ascending: true })
        .order("id", { ascending: true })
        .limit(1)
        .maybeSingle();

  if (result.error) throw result.error;
  if (!result.data) throw new Error("No active rota location is available");
  return result.data as LocationRow;
}

async function selectWeek(
  supabase: SupabaseClient,
  workspaceId: string,
  locationId: string,
  weekStart: string,
): Promise<RotaWeekRow | null> {
  const { data, error } = await supabase
    .from("rota_weeks")
    .select("id, location_id, week_start, status")
    .eq("workspace_id", workspaceId)
    .eq("location_id", locationId)
    .eq("week_start", weekStart)
    .maybeSingle();

  if (error) throw error;
  return (data as RotaWeekRow | null) ?? null;
}

export async function getLiveContext(
  data: z.infer<typeof liveWeekInput>,
  options: { createWeek: boolean },
): Promise<LiveMutationContext> {
  const { getSupabaseServerClient } = await import("@/lib/supabase/serverClient");
  const supabase = getSupabaseServerClient();
  const workspaceId = await resolveWorkspace(supabase);
  const location = await selectLocation(supabase, workspaceId, data.locationId);
  const weekStart = weekStartForOffset(location.timezone, data.weekOffset);
  const week = await selectWeek(supabase, workspaceId, location.id, weekStart);
  if (!week && !options.createWeek)
    return { supabase, workspaceId, location, weekStart, week: null };
  return { supabase, workspaceId, location, weekStart, week };
}

export function requireEditableWeek(week: RotaWeekRow): RotaWeekRow {
  if (week.status === "archived") throw new Error("Archived rota weeks cannot be edited");
  return week;
}

export async function ensureWeek(context: LiveMutationContext): Promise<RotaWeekRow> {
  if (context.week) return requireEditableWeek(context.week);

  const { data, error } = await context.supabase
    .from("rota_weeks")
    .insert({
      workspace_id: context.workspaceId,
      location_id: context.location.id,
      week_start: context.weekStart,
      status: "draft",
    })
    .select("id, location_id, week_start, status")
    .single();

  if (error && error.code !== "23505") throw error;
  const week =
    error?.code === "23505"
      ? await selectWeek(
          context.supabase,
          context.workspaceId,
          context.location.id,
          context.weekStart,
        )
      : (data as RotaWeekRow | null);
  if (!week) throw new Error("Unable to create rota week");
  return requireEditableWeek(week);
}
