import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Manager-side labour planning settings (workspace_settings). Reads and writes
 * run as server functions bound to the caller's session; the active manager
 * workspace is resolved server-side and RLS backs up tenant enforcement.
 *
 * Money is stored in pence and budgets in minutes; the UI converts.
 */

export type WorkspaceLabourSettings = {
  weeklyBudgetMinutes: number | null;
  dailyBudgetMinutes: number | null;
  targetLabourPct: number | null;
  forecastWeeklySalesPence: number | null;
  avgHourlyCostPence: number | null;
  budgetWarningPct: number;
};

export type WorkspaceLabourSettingsResult = {
  /** Null when the workspace has not saved labour settings yet. */
  settings: WorkspaceLabourSettings | null;
};

interface SettingsRow {
  weekly_budget_minutes: number | null;
  daily_budget_minutes: number | null;
  target_labour_pct: string | number | null;
  forecast_weekly_sales_pence: number | null;
  avg_hourly_cost_pence: number | null;
  budget_warning_pct: number;
}

const SETTINGS_COLUMNS =
  "weekly_budget_minutes, daily_budget_minutes, target_labour_pct, forecast_weekly_sales_pence, avg_hourly_cost_pence, budget_warning_pct";

function mapSettings(row: SettingsRow): WorkspaceLabourSettings {
  return {
    weeklyBudgetMinutes: row.weekly_budget_minutes,
    dailyBudgetMinutes: row.daily_budget_minutes,
    targetLabourPct: row.target_labour_pct === null ? null : Number(row.target_labour_pct),
    forecastWeeklySalesPence: row.forecast_weekly_sales_pence,
    avgHourlyCostPence: row.avg_hourly_cost_pence,
    budgetWarningPct: row.budget_warning_pct,
  };
}

export const fetchWorkspaceLabourSettingsFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<WorkspaceLabourSettingsResult> => {
    const { getSupabaseServerClient } = await import("@/lib/supabase/serverClient");
    const { requireActiveManagerWorkspaceId } =
      await import("@/features/auth/api/activeManagerWorkspace");
    const supabase = getSupabaseServerClient();
    const workspaceId = await requireActiveManagerWorkspaceId(supabase);

    const { data, error } = await supabase
      .from("workspace_settings")
      .select(SETTINGS_COLUMNS)
      .eq("workspace_id", workspaceId)
      .maybeSingle();
    if (error) throw error;

    return { settings: data ? mapSettings(data as SettingsRow) : null };
  },
);

const saveSettingsInput = z.object({
  weeklyBudgetMinutes: z.number().int().min(0).max(1_000_000).nullable(),
  dailyBudgetMinutes: z.number().int().min(0).max(200_000).nullable(),
  targetLabourPct: z.number().gt(0).max(100).nullable(),
  forecastWeeklySalesPence: z.number().int().min(0).max(10_000_000_000).nullable(),
  avgHourlyCostPence: z.number().int().min(0).max(100_000).nullable(),
  budgetWarningPct: z.number().int().min(50).max(120),
});

export type SaveWorkspaceLabourSettingsInput = z.infer<typeof saveSettingsInput>;

export const saveWorkspaceLabourSettingsFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => saveSettingsInput.parse(input))
  .handler(async ({ data }): Promise<WorkspaceLabourSettingsResult> => {
    const { getSupabaseServerClient } = await import("@/lib/supabase/serverClient");
    const { requireActiveManagerWorkspaceId } =
      await import("@/features/auth/api/activeManagerWorkspace");
    const supabase = getSupabaseServerClient();
    const workspaceId = await requireActiveManagerWorkspaceId(supabase);

    const { data: saved, error } = await supabase
      .from("workspace_settings")
      .upsert(
        {
          workspace_id: workspaceId,
          weekly_budget_minutes: data.weeklyBudgetMinutes,
          daily_budget_minutes: data.dailyBudgetMinutes,
          target_labour_pct: data.targetLabourPct,
          forecast_weekly_sales_pence: data.forecastWeeklySalesPence,
          avg_hourly_cost_pence: data.avgHourlyCostPence,
          budget_warning_pct: data.budgetWarningPct,
        },
        { onConflict: "workspace_id" },
      )
      .select(SETTINGS_COLUMNS)
      .single();
    if (error) throw error;

    return { settings: mapSettings(saved as SettingsRow) };
  });
