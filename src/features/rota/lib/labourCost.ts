import type { DraftShift } from "../types";
import { shiftHours } from "./draftRota";
import type { WorkspaceLabourSettings } from "@/features/settings/api/workspaceSettings";

/** staff id → current hourly rate in pence. */
export type StaffRateMap = Record<string, number>;

export type BudgetState = "no-budget" | "within" | "near" | "over";

export type LabourCostView = {
  /**
   * Estimated cost of all assigned shifts in pence, breaks deducted. Null when
   * no honest basis exists (a shift has no per-staff rate and no fallback is set).
   */
  estCostPence: number | null;
  /** True when at least one assigned shift used the fallback rate. */
  usedFallbackRate: boolean;
  /** Weekly budget in hours from settings, or null when unset. */
  budgetHours: number | null;
  /** Estimated labour % of forecast sales, when both sides are available. */
  labourPct: number | null;
  targetLabourPct: number | null;
  budgetState: BudgetState;
};

/** Paid hours for one shift: scheduled span minus unpaid break, never negative. */
export function paidShiftHours(shift: Pick<DraftShift, "start" | "end" | "breakMinutes">): number {
  const gross = shiftHours(shift.start, shift.end);
  const breakHours = (shift.breakMinutes ?? 0) / 60;
  return Math.max(0, gross - breakHours);
}

function resolveBudgetState(
  scheduledHours: number,
  budgetHours: number | null,
  warningPct: number,
): BudgetState {
  if (budgetHours === null || budgetHours <= 0) return "no-budget";
  if (scheduledHours > budgetHours) return "over";
  if (scheduledHours >= budgetHours * (warningPct / 100)) return "near";
  return "within";
}

/**
 * Live labour estimate for the rota insights rail. Cost covers assigned shifts
 * only (open shifts are counted separately in the readiness panel), using each
 * staff member's recorded rate and the workspace fallback rate otherwise.
 */
export function estimateLabourCost({
  shifts,
  scheduledHours,
  rates,
  settings,
}: {
  shifts: DraftShift[];
  scheduledHours: number;
  rates: StaffRateMap;
  settings: WorkspaceLabourSettings | null;
}): LabourCostView {
  const fallback = settings?.avgHourlyCostPence ?? null;
  const budgetHours =
    settings?.weeklyBudgetMinutes === null || settings?.weeklyBudgetMinutes === undefined
      ? null
      : settings.weeklyBudgetMinutes / 60;
  const warningPct = settings?.budgetWarningPct ?? 95;

  let costPence = 0;
  let usedFallbackRate = false;
  let hasCompleteBasis = true;
  for (const shift of shifts) {
    if (shift.staffId === null) continue;
    const rate = rates[shift.staffId] ?? null;
    if (rate === null && fallback === null) {
      hasCompleteBasis = false;
      break;
    }
    if (rate === null) usedFallbackRate = true;
    costPence += paidShiftHours(shift) * (rate ?? fallback ?? 0);
  }

  const estCostPence = hasCompleteBasis ? Math.round(costPence) : null;
  const forecast = settings?.forecastWeeklySalesPence ?? null;
  const labourPct =
    estCostPence !== null && forecast !== null && forecast > 0
      ? (estCostPence / forecast) * 100
      : null;

  return {
    estCostPence,
    usedFallbackRate,
    budgetHours,
    labourPct,
    targetLabourPct: settings?.targetLabourPct ?? null,
    budgetState: resolveBudgetState(scheduledHours, budgetHours, warningPct),
  };
}
