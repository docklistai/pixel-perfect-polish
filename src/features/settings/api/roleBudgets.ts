import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Manager-side per-role weekly hours budgets (workspace_role_budgets). Reads and
 * writes are RLS-scoped to the active manager workspace. Minutes in storage; the
 * UI converts to hours.
 */

export type RoleBudget = {
  id: string;
  roleName: string;
  weeklyBudgetMinutes: number;
};

interface RoleBudgetRow {
  id: string;
  role_name: string;
  weekly_budget_minutes: number;
}

export const fetchRoleBudgetsFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ budgets: RoleBudget[] }> => {
    const { getSupabaseServerClient } = await import("@/lib/supabase/serverClient");
    const { requireActiveManagerWorkspaceId } = await import(
      "@/features/auth/api/activeManagerWorkspace"
    );
    const supabase = getSupabaseServerClient();
    const workspaceId = await requireActiveManagerWorkspaceId(supabase);

    const { data, error } = await supabase
      .from("workspace_role_budgets")
      .select("id, role_name, weekly_budget_minutes")
      .eq("workspace_id", workspaceId)
      .order("role_name", { ascending: true });
    if (error) throw error;

    return {
      budgets: ((data as RoleBudgetRow[] | null) ?? []).map((row) => ({
        id: row.id,
        roleName: row.role_name,
        weeklyBudgetMinutes: row.weekly_budget_minutes,
      })),
    };
  },
);

const saveSchema = z.object({
  roleName: z.string().trim().min(1).max(120),
  weeklyBudgetMinutes: z.number().int().min(0).max(1_000_000),
});

export type SaveRoleBudgetInput = z.infer<typeof saveSchema>;

export const saveRoleBudgetFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => saveSchema.parse(input))
  .handler(async ({ data }): Promise<{ ok: true } | { ok: false; message: string }> => {
    const { getSupabaseServerClient } = await import("@/lib/supabase/serverClient");
    const { requireActiveManagerWorkspaceId } = await import(
      "@/features/auth/api/activeManagerWorkspace"
    );
    const supabase = getSupabaseServerClient();
    const workspaceId = await requireActiveManagerWorkspaceId(supabase);

    const { error } = await supabase.from("workspace_role_budgets").upsert(
      {
        workspace_id: workspaceId,
        role_name: data.roleName,
        weekly_budget_minutes: data.weeklyBudgetMinutes,
      },
      { onConflict: "workspace_id,role_name" },
    );
    if (error) return { ok: false, message: "Couldn't save the role budget. Please try again." };
    return { ok: true };
  });

const deleteSchema = z.object({ id: z.string().uuid() });

export const deleteRoleBudgetFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => deleteSchema.parse(input))
  .handler(async ({ data }): Promise<{ ok: true } | { ok: false; message: string }> => {
    const { getSupabaseServerClient } = await import("@/lib/supabase/serverClient");
    const { requireActiveManagerWorkspaceId } = await import(
      "@/features/auth/api/activeManagerWorkspace"
    );
    const supabase = getSupabaseServerClient();
    const workspaceId = await requireActiveManagerWorkspaceId(supabase);

    const { error } = await supabase
      .from("workspace_role_budgets")
      .delete()
      .eq("workspace_id", workspaceId)
      .eq("id", data.id);
    if (error) return { ok: false, message: "Couldn't remove the role budget. Please try again." };
    return { ok: true };
  });
