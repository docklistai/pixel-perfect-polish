import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { hasAnyOpenDay, NO_OPEN_DAYS_MESSAGE } from "../lib/openingDays";
import { locationHasScheduleData } from "./locationScheduleLock";

/**
 * Workspace profile settings. The business name is the one identity field the
 * data model supports today; it updates the manager-scoped workspaces row under
 * the `workspaces_manager_update` RLS policy (owner/manager only).
 */

export type UpdateWorkspaceNameResult = { ok: true } | { ok: false; message: string };

export type WorkspaceProfile = {
  name: string;
  /** 7-bit open-days mask (bit 0 = Mon .. 6 = Sun), or null when unconfigured. */
  openWeekdaysMask: number | null;
  /** Default opening time "HH:MM", or null when unconfigured. */
  openTime: string | null;
  /** Default closing time "HH:MM", or null when unconfigured. */
  closeTime: string | null;
  /**
   * The workspace's primary (first active) location, or null if none.
   *
   * `timezoneLocked` mirrors the server-side refusal in
   * `updateLocationTimezoneFn` so the field can be disabled with an honest
   * reason. The lock is authoritative there, not here.
   */
  primaryLocation: {
    id: string;
    name: string;
    timezone: string;
    timezoneLocked: boolean;
  } | null;
  /** First weekday of the rota week: 0 = Monday .. 6 = Sunday. */
  rotaStartWeekday: number;
  /** True once any rota week exists — the start day is locked from then on. */
  hasRotas: boolean;
};

/** Postgres `time` ("HH:MM:SS") → "HH:MM", or null. */
function toHhmm(value: string | null): string | null {
  return value ? value.slice(0, 5) : null;
}

export const fetchWorkspaceProfileFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<WorkspaceProfile> => {
    const { getSupabaseServerClient } = await import("@/lib/supabase/serverClient");
    const { requireActiveManagerWorkspaceId } =
      await import("@/features/auth/api/activeManagerWorkspace");
    const supabase = getSupabaseServerClient();
    const workspaceId = await requireActiveManagerWorkspaceId(supabase);

    const [workspaceRes, locationRes, rotaWeekRes] = await Promise.all([
      supabase
        .from("workspaces")
        .select(
          "name, open_weekdays_mask, default_open_time, default_close_time, rota_start_weekday",
        )
        .eq("id", workspaceId)
        .single(),
      supabase
        .from("locations")
        .select("id, name, timezone")
        .eq("workspace_id", workspaceId)
        .eq("status", "active")
        .order("created_at", { ascending: true })
        .limit(1),
      supabase.from("rota_weeks").select("id").eq("workspace_id", workspaceId).limit(1),
    ]);
    if (workspaceRes.error) throw workspaceRes.error;
    if (locationRes.error) throw locationRes.error;
    if (rotaWeekRes.error) throw rotaWeekRes.error;

    const row = workspaceRes.data as {
      name: string;
      open_weekdays_mask: number | null;
      default_open_time: string | null;
      default_close_time: string | null;
      rota_start_weekday: number;
    };
    const location =
      ((locationRes.data as { id: string; name: string; timezone: string }[] | null) ?? [])[0] ??
      null;
    // Only asked once a location exists; there is nothing to lock otherwise.
    const timezoneLocked =
      location === null
        ? false
        : await locationHasScheduleData({ supabase, workspaceId, locationId: location.id });
    return {
      name: row.name,
      openWeekdaysMask: row.open_weekdays_mask,
      openTime: toHhmm(row.default_open_time),
      closeTime: toHhmm(row.default_close_time),
      primaryLocation: location === null ? null : { ...location, timezoneLocked },
      rotaStartWeekday: row.rota_start_weekday ?? 0,
      hasRotas: ((rotaWeekRes.data as { id: string }[] | null) ?? []).length > 0,
    };
  },
);

const rotaStartSchema = z.object({ rotaStartWeekday: z.number().int().min(0).max(6) });

export const updateRotaStartDayFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => rotaStartSchema.parse(input))
  .handler(async ({ data }): Promise<UpdateWorkspaceNameResult> => {
    const { getSupabaseServerClient } = await import("@/lib/supabase/serverClient");
    const { requireActiveManagerWorkspaceId } =
      await import("@/features/auth/api/activeManagerWorkspace");
    const supabase = getSupabaseServerClient();
    const workspaceId = await requireActiveManagerWorkspaceId(supabase);

    // Guard: once any rota week exists it has a fixed start date, so changing the
    // start day would strand those weeks. Lock the setting from then on.
    const { data: existing, error: checkError } = await supabase
      .from("rota_weeks")
      .select("id")
      .eq("workspace_id", workspaceId)
      .limit(1);
    if (checkError) return { ok: false, message: "Couldn't save. Please try again." };
    if ((existing ?? []).length > 0) {
      return {
        ok: false,
        message:
          "Set your rota start day before building any rotas — it's locked once a week exists.",
      };
    }

    const { error } = await supabase
      .from("workspaces")
      .update({ rota_start_weekday: data.rotaStartWeekday })
      .eq("id", workspaceId);
    if (error) {
      return {
        ok: false,
        message:
          error.code === "42501"
            ? "Only an owner or manager can change the rota start day."
            : "Couldn't save the rota start day. Please try again.",
      };
    }
    return { ok: true };
  });

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const openingTimesSchema = z.object({
  openTime: z.string().regex(HHMM).nullable(),
  closeTime: z.string().regex(HHMM).nullable(),
});

export const updateOpeningTimesFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => openingTimesSchema.parse(input))
  .handler(async ({ data }): Promise<UpdateWorkspaceNameResult> => {
    const { getSupabaseServerClient } = await import("@/lib/supabase/serverClient");
    const { requireActiveManagerWorkspaceId } =
      await import("@/features/auth/api/activeManagerWorkspace");
    const supabase = getSupabaseServerClient();
    const workspaceId = await requireActiveManagerWorkspaceId(supabase);
    const { error } = await supabase
      .from("workspaces")
      .update({ default_open_time: data.openTime, default_close_time: data.closeTime })
      .eq("id", workspaceId);
    if (error) {
      return {
        ok: false,
        message:
          error.code === "42501"
            ? "Only an owner or manager can change opening hours."
            : "Couldn't save opening hours. Please try again.",
      };
    }
    return { ok: true };
  });

const openingDaysSchema = z.object({ openWeekdaysMask: z.number().int().min(0).max(127) });

export const updateOpeningDaysFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => openingDaysSchema.parse(input))
  .handler(async ({ data }): Promise<UpdateWorkspaceNameResult> => {
    const { getSupabaseServerClient } = await import("@/lib/supabase/serverClient");
    const { requireActiveManagerWorkspaceId } =
      await import("@/features/auth/api/activeManagerWorkspace");
    const supabase = getSupabaseServerClient();
    const workspaceId = await requireActiveManagerWorkspaceId(supabase);

    // The column's CHECK admits 0, but an all-closed week is never a real answer:
    // it would flag every scheduled shift as a closed-day shift. Refused here so
    // the rule holds for a direct server-function call too, not just the toggles.
    if (!hasAnyOpenDay(data.openWeekdaysMask)) {
      return { ok: false, message: NO_OPEN_DAYS_MESSAGE };
    }

    const { error } = await supabase
      .from("workspaces")
      .update({ open_weekdays_mask: data.openWeekdaysMask })
      .eq("id", workspaceId);
    if (error) {
      return {
        ok: false,
        message:
          error.code === "42501"
            ? "Only an owner or manager can change opening days."
            : "Couldn't save opening days. Please try again.",
      };
    }
    return { ok: true };
  });

const schema = z.object({ name: z.string().trim().min(1).max(120) });

export const updateWorkspaceNameFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => schema.parse(input))
  .handler(async ({ data }): Promise<UpdateWorkspaceNameResult> => {
    const { getSupabaseServerClient } = await import("@/lib/supabase/serverClient");
    const { requireActiveManagerWorkspaceId } =
      await import("@/features/auth/api/activeManagerWorkspace");
    const supabase = getSupabaseServerClient();
    const workspaceId = await requireActiveManagerWorkspaceId(supabase);

    const { error } = await supabase
      .from("workspaces")
      .update({ name: data.name })
      .eq("id", workspaceId);
    if (error) {
      return {
        ok: false,
        message:
          error.code === "42501"
            ? "Only an owner or manager can rename the workspace."
            : "Couldn't save the workspace name. Please try again.",
      };
    }
    return { ok: true };
  });
