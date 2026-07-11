import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Manager-side "copy a day onto other days". Runs the phase 20
 * `rpc_copy_rota_day` SECURITY DEFINER function, which re-derives the caller and
 * enforces manager role + a draft week server-side.
 */

export type CopyRotaDayResult =
  | { ok: true; shiftsCreated: number }
  | { ok: false; message: string };

const schema = z.object({
  rotaWeekId: z.string().uuid(),
  fromWeekday: z.number().int().min(0).max(6),
  toWeekdays: z.array(z.number().int().min(0).max(6)).min(1).max(7),
});

export const copyRotaDayFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => schema.parse(input))
  .handler(async ({ data }): Promise<CopyRotaDayResult> => {
    const { getSupabaseServerClient } = await import("@/lib/supabase/serverClient");
    const { requireActiveManagerWorkspaceId } =
      await import("@/features/auth/api/activeManagerWorkspace");
    const supabase = getSupabaseServerClient();
    const workspaceId = await requireActiveManagerWorkspaceId(supabase);

    const { data: result, error } = await supabase.rpc("rpc_copy_rota_day", {
      p_workspace_id: workspaceId,
      p_rota_week_id: data.rotaWeekId,
      p_from_weekday: data.fromWeekday,
      p_to_weekdays: data.toWeekdays,
    });
    if (error) {
      const message =
        error.code === "42501"
          ? "You need manager access to copy a day."
          : error.code === "55000"
            ? "Days can only be copied within a draft week."
            : error.code === "P0002"
              ? "That rota week could not be found."
              : "Couldn't copy the day. Please try again.";
      return { ok: false, message };
    }
    const created = (result as { shifts_created?: number } | null)?.shifts_created ?? 0;
    return { ok: true, shiftsCreated: created };
  });

export type ClearRotaDayResult =
  | { ok: true; shiftsRemoved: number }
  | { ok: false; message: string };

const clearSchema = z.object({
  rotaWeekId: z.string().uuid(),
  weekday: z.number().int().min(0).max(6),
});

export const clearRotaDayFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => clearSchema.parse(input))
  .handler(async ({ data }): Promise<ClearRotaDayResult> => {
    const { getSupabaseServerClient } = await import("@/lib/supabase/serverClient");
    const { requireActiveManagerWorkspaceId } =
      await import("@/features/auth/api/activeManagerWorkspace");
    const supabase = getSupabaseServerClient();
    const workspaceId = await requireActiveManagerWorkspaceId(supabase);

    const { data: result, error } = await supabase.rpc("rpc_clear_rota_day", {
      p_workspace_id: workspaceId,
      p_rota_week_id: data.rotaWeekId,
      p_weekday: data.weekday,
    });
    if (error) {
      const message =
        error.code === "42501"
          ? "You need manager access to clear a day."
          : error.code === "55000"
            ? "Days can only be cleared within a draft week."
            : "Couldn't clear the day. Please try again.";
      return { ok: false, message };
    }
    const removed = (result as { shifts_removed?: number } | null)?.shifts_removed ?? 0;
    return { ok: true, shiftsRemoved: removed };
  });
