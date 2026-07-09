import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Manager-side rota demand templates. Reads are RLS-scoped to the active
 * manager workspace; save/apply go through the phase 15 SECURITY DEFINER RPCs
 * (`rpc_save_demand_template` derives a week's demand server-side;
 * `rpc_apply_demand_template` stamps it onto a draft week as open shifts).
 */

export type DemandTemplateSummary = {
  id: string;
  name: string;
  notes: string | null;
  /** Total open shifts this template would create. */
  totalShifts: number;
  /** Number of distinct weekdays the template covers. */
  dayCount: number;
};

interface TemplateRow {
  id: string;
  name: string;
  notes: string | null;
}
interface SlotRow {
  template_id: string;
  weekday: number;
  quantity: number;
}

export const fetchDemandTemplatesFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ templates: DemandTemplateSummary[] }> => {
    const { getSupabaseServerClient } = await import("@/lib/supabase/serverClient");
    const { requireActiveManagerWorkspaceId } = await import(
      "@/features/auth/api/activeManagerWorkspace"
    );
    const supabase = getSupabaseServerClient();
    const workspaceId = await requireActiveManagerWorkspaceId(supabase);

    const [templatesRes, slotsRes] = await Promise.all([
      supabase
        .from("rota_demand_templates")
        .select("id, name, notes")
        .eq("workspace_id", workspaceId)
        .order("name", { ascending: true }),
      supabase
        .from("rota_demand_template_slots")
        .select("template_id, weekday, quantity")
        .eq("workspace_id", workspaceId),
    ]);
    if (templatesRes.error) throw templatesRes.error;
    if (slotsRes.error) throw slotsRes.error;

    const totals = new Map<string, number>();
    const days = new Map<string, Set<number>>();
    for (const slot of (slotsRes.data ?? []) as SlotRow[]) {
      totals.set(slot.template_id, (totals.get(slot.template_id) ?? 0) + slot.quantity);
      const set = days.get(slot.template_id) ?? new Set<number>();
      set.add(slot.weekday);
      days.set(slot.template_id, set);
    }

    return {
      templates: ((templatesRes.data ?? []) as TemplateRow[]).map((row) => ({
        id: row.id,
        name: row.name,
        notes: row.notes,
        totalShifts: totals.get(row.id) ?? 0,
        dayCount: days.get(row.id)?.size ?? 0,
      })),
    };
  },
);

export type DemandTemplateWriteResult =
  | { ok: true; openShiftsCreated?: number }
  | { ok: false; message: string };

function describeError(sqlState: string | null, context: "save" | "apply"): string {
  switch (sqlState) {
    case "42501":
      return "You need manager access to manage rota templates.";
    case "55000":
      return context === "save"
        ? "This week has no shifts to save as a template yet."
        : "Templates can only be applied to a draft week.";
    case "P0002":
      return context === "save" ? "That rota week could not be found." : "That template no longer exists.";
    case "22023":
      return "Check the template name, then try again.";
    default:
      return "Something went wrong. Please try again.";
  }
}

const saveSchema = z.object({
  rotaWeekId: z.string().uuid(),
  name: z.string().trim().min(1).max(80),
  notes: z.string().trim().max(500).nullable(),
});

export const saveDemandTemplateFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => saveSchema.parse(input))
  .handler(async ({ data }): Promise<DemandTemplateWriteResult> => {
    const { getSupabaseServerClient } = await import("@/lib/supabase/serverClient");
    const { requireActiveManagerWorkspaceId } = await import(
      "@/features/auth/api/activeManagerWorkspace"
    );
    const supabase = getSupabaseServerClient();
    const workspaceId = await requireActiveManagerWorkspaceId(supabase);
    const { error } = await supabase.rpc("rpc_save_demand_template", {
      p_workspace_id: workspaceId,
      p_rota_week_id: data.rotaWeekId,
      p_name: data.name,
      p_notes: data.notes,
    });
    if (error) return { ok: false, message: describeError(error.code ?? null, "save") };
    return { ok: true };
  });

const applySchema = z.object({
  rotaWeekId: z.string().uuid(),
  templateId: z.string().uuid(),
});

export const applyDemandTemplateFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => applySchema.parse(input))
  .handler(async ({ data }): Promise<DemandTemplateWriteResult> => {
    const { getSupabaseServerClient } = await import("@/lib/supabase/serverClient");
    const { requireActiveManagerWorkspaceId } = await import(
      "@/features/auth/api/activeManagerWorkspace"
    );
    const supabase = getSupabaseServerClient();
    const workspaceId = await requireActiveManagerWorkspaceId(supabase);
    const { data: result, error } = await supabase.rpc("rpc_apply_demand_template", {
      p_workspace_id: workspaceId,
      p_rota_week_id: data.rotaWeekId,
      p_template_id: data.templateId,
    });
    if (error) return { ok: false, message: describeError(error.code ?? null, "apply") };
    const created = (result as { open_shifts_created?: number } | null)?.open_shifts_created;
    return { ok: true, openShiftsCreated: created ?? 0 };
  });

const deleteSchema = z.object({ templateId: z.string().uuid() });

export const deleteDemandTemplateFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => deleteSchema.parse(input))
  .handler(async ({ data }): Promise<DemandTemplateWriteResult> => {
    const { getSupabaseServerClient } = await import("@/lib/supabase/serverClient");
    const { requireActiveManagerWorkspaceId } = await import(
      "@/features/auth/api/activeManagerWorkspace"
    );
    const supabase = getSupabaseServerClient();
    const workspaceId = await requireActiveManagerWorkspaceId(supabase);
    const { error } = await supabase
      .from("rota_demand_templates")
      .delete()
      .eq("workspace_id", workspaceId)
      .eq("id", data.templateId);
    if (error) return { ok: false, message: "Couldn't delete the template. Please try again." };
    return { ok: true };
  });
