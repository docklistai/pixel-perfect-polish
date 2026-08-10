import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { locationHasScheduleData, TIMEZONE_LOCKED_MESSAGE } from "./locationScheduleLock";
import type { UpdateWorkspaceNameResult } from "./workspaceProfile";

/**
 * Writes against a single `locations` row, split from the workspace-level
 * settings so each file stays one domain's worth of actions.
 *
 * Both run under `locations_manager_all` RLS and are scoped by
 * `(workspace_id, id)`, so a client-supplied `locationId` can only ever address
 * a location in the caller's own workspace.
 */

const locationSchema = z.object({
  locationId: z.string().uuid(),
  name: z.string().trim().min(1).max(120),
});

export const updateLocationNameFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => locationSchema.parse(input))
  .handler(async ({ data }): Promise<UpdateWorkspaceNameResult> => {
    const { getSupabaseServerClient } = await import("@/lib/supabase/serverClient");
    const { requireActiveManagerWorkspaceId } =
      await import("@/features/auth/api/activeManagerWorkspace");
    const supabase = getSupabaseServerClient();
    const workspaceId = await requireActiveManagerWorkspaceId(supabase);
    const { error } = await supabase
      .from("locations")
      .update({ name: data.name })
      .eq("workspace_id", workspaceId)
      .eq("id", data.locationId);
    if (error) {
      return {
        ok: false,
        message:
          error.code === "42501"
            ? "Only an owner or manager can rename the location."
            : "Couldn't save the location name. Please try again.",
      };
    }
    return { ok: true };
  });

const timezoneSchema = z.object({
  locationId: z.string().uuid(),
  timezone: z.string().trim().min(1).max(60),
});

export const updateLocationTimezoneFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => timezoneSchema.parse(input))
  .handler(async ({ data }): Promise<UpdateWorkspaceNameResult> => {
    const { getSupabaseServerClient } = await import("@/lib/supabase/serverClient");
    const { requireActiveManagerWorkspaceId } =
      await import("@/features/auth/api/activeManagerWorkspace");
    const supabase = getSupabaseServerClient();
    const workspaceId = await requireActiveManagerWorkspaceId(supabase);

    // Guard: the stored instants never move, but every surface renders them in
    // this zone — including already-published snapshots on the staff portal. Once
    // this location has scheduling data the change is refused outright, so the UI
    // lock cannot be bypassed by calling the server function directly.
    if (await locationHasScheduleData({ supabase, workspaceId, locationId: data.locationId })) {
      return { ok: false, message: TIMEZONE_LOCKED_MESSAGE };
    }

    const { error } = await supabase
      .from("locations")
      .update({ timezone: data.timezone })
      .eq("workspace_id", workspaceId)
      .eq("id", data.locationId);
    if (error) {
      return {
        ok: false,
        message:
          error.code === "42501"
            ? "Only an owner or manager can change the time zone."
            : "Couldn't save the time zone. Please try again.",
      };
    }
    return { ok: true };
  });
