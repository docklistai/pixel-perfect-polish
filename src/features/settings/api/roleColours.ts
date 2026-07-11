import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Manager-side per-role colour presets (workspace_role_colours). RLS-scoped to
 * the active manager workspace. The Rota grid prefers these over the built-in
 * department palette; a per-shift override still wins over both.
 */

export const COLOUR_PRESETS = [
  "blue",
  "amber",
  "purple",
  "green",
  "rose",
  "teal",
  "slate",
] as const;
export type ColourPreset = (typeof COLOUR_PRESETS)[number];

export type RoleColour = {
  id: string;
  roleName: string;
  colourPreset: ColourPreset;
};

interface RoleColourRow {
  id: string;
  role_name: string;
  colour_preset: ColourPreset;
}

export const fetchRoleColoursFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ colours: RoleColour[] }> => {
    const { getSupabaseServerClient } = await import("@/lib/supabase/serverClient");
    const { requireActiveManagerWorkspaceId } =
      await import("@/features/auth/api/activeManagerWorkspace");
    const supabase = getSupabaseServerClient();
    const workspaceId = await requireActiveManagerWorkspaceId(supabase);

    const { data, error } = await supabase
      .from("workspace_role_colours")
      .select("id, role_name, colour_preset")
      .eq("workspace_id", workspaceId)
      .order("role_name", { ascending: true });
    if (error) throw error;

    return {
      colours: ((data as RoleColourRow[] | null) ?? []).map((row) => ({
        id: row.id,
        roleName: row.role_name,
        colourPreset: row.colour_preset,
      })),
    };
  },
);

const saveSchema = z.object({
  roleName: z.string().trim().min(1).max(120),
  colourPreset: z.enum(COLOUR_PRESETS),
});

export type SaveRoleColourInput = z.infer<typeof saveSchema>;

export const saveRoleColourFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => saveSchema.parse(input))
  .handler(async ({ data }): Promise<{ ok: true } | { ok: false; message: string }> => {
    const { getSupabaseServerClient } = await import("@/lib/supabase/serverClient");
    const { requireActiveManagerWorkspaceId } =
      await import("@/features/auth/api/activeManagerWorkspace");
    const supabase = getSupabaseServerClient();
    const workspaceId = await requireActiveManagerWorkspaceId(supabase);

    const { error } = await supabase
      .from("workspace_role_colours")
      .upsert(
        { workspace_id: workspaceId, role_name: data.roleName, colour_preset: data.colourPreset },
        { onConflict: "workspace_id,role_name" },
      );
    if (error) return { ok: false, message: "Couldn't save the role colour. Please try again." };
    return { ok: true };
  });

const deleteSchema = z.object({ id: z.string().uuid() });

export const deleteRoleColourFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => deleteSchema.parse(input))
  .handler(async ({ data }): Promise<{ ok: true } | { ok: false; message: string }> => {
    const { getSupabaseServerClient } = await import("@/lib/supabase/serverClient");
    const { requireActiveManagerWorkspaceId } =
      await import("@/features/auth/api/activeManagerWorkspace");
    const supabase = getSupabaseServerClient();
    const workspaceId = await requireActiveManagerWorkspaceId(supabase);

    const { error } = await supabase
      .from("workspace_role_colours")
      .delete()
      .eq("workspace_id", workspaceId)
      .eq("id", data.id);
    if (error) return { ok: false, message: "Couldn't remove the role colour. Please try again." };
    return { ok: true };
  });
