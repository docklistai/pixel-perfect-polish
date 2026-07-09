import { useWorkspaceLabourSettings } from "@/features/settings/hooks/useWorkspaceLabourSettings";
import { useRoleBudgets } from "@/features/settings/hooks/useRoleBudgets";
import { useWorkspaceProfile } from "@/features/settings/hooks/useWorkspaceProfile";
import { useStaffPayRates } from "@/features/staff/hooks/useStaffPayRates";
import { estimateLabourCost, type LabourCostView } from "../lib/labourCost";
import { buildDailyBudgetView, type DailyBudgetView } from "../lib/dailyBudget";
import { buildRoleBudgetView, type RoleBudgetView } from "../lib/roleBudget";
import { findClosedDayShifts, type ClosedDayShift } from "../lib/closedDayShifts";
import { buildOutsideHoursShifts, type OutsideHoursShift } from "../lib/outsideOpeningHours";
import type { DraftShift } from "../types";

export type RotaInsights = {
  /** Live cost estimate; null while demo data or unset settings are on screen. */
  labour: LabourCostView | null;
  dailyBudget: DailyBudgetView | null;
  roleBudget: RoleBudgetView | null;
  closedDayShifts: ClosedDayShift[];
  outsideHoursShifts: OutsideHoursShift[];
};

/**
 * Derives the live insights (labour cost, daily/role budgets, closed-day shifts)
 * from the workspace's saved settings and this week's draft. Extracted from the
 * insights column so both stay within the file-size limits and the settings
 * hooks live in one place.
 */
export function useRotaInsights(input: {
  source: "live" | "demo";
  draftShifts: DraftShift[];
  scheduledHours: number;
  days: { d: string; hours: number }[];
  dayIsoDates: string[];
}): RotaInsights {
  const labourSettings = useWorkspaceLabourSettings();
  const roleBudgets = useRoleBudgets();
  const payRates = useStaffPayRates();
  const profile = useWorkspaceProfile();
  const isLive = input.source === "live";

  const labour =
    isLive && labourSettings.enabled && !labourSettings.isLoading
      ? estimateLabourCost({
          shifts: input.draftShifts,
          scheduledHours: input.scheduledHours,
          rates: payRates.rates,
          settings: labourSettings.settings,
        })
      : null;

  const dailyBudgetMinutes = isLive ? (labourSettings.settings?.dailyBudgetMinutes ?? null) : null;
  const dailyBudget =
    dailyBudgetMinutes !== null ? buildDailyBudgetView(input.days, dailyBudgetMinutes) : null;

  const roleBudget =
    isLive && roleBudgets.budgets.length > 0
      ? buildRoleBudgetView(
          input.draftShifts,
          roleBudgets.budgets.map((budget) => ({
            role: budget.roleName,
            minutes: budget.weeklyBudgetMinutes,
          })),
        )
      : null;

  const closedDayShifts = isLive
    ? findClosedDayShifts(input.draftShifts, input.dayIsoDates, profile.openWeekdaysMask)
    : [];

  const outsideHoursShifts = isLive
    ? buildOutsideHoursShifts(input.draftShifts, profile.openTime, profile.closeTime)
    : [];

  return { labour, dailyBudget, roleBudget, closedDayShifts, outsideHoursShifts };
}
