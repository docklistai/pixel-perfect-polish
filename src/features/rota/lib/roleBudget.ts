import type { DraftShift } from "../types";
import { shiftHours } from "./draftRota";

/**
 * Per-role weekly hours against each role's budget. Scheduled (assigned) hours
 * are summed by role, matched to budgets case-insensitively, so a manager can
 * catch a role/area running over its weekly cap while building the rota.
 */

export type RoleBudgetRow = {
  role: string;
  hours: number;
  budgetHours: number;
  over: boolean;
  overBy: number;
};

export type RoleBudgetView = {
  rows: RoleBudgetRow[];
  overCount: number;
};

export function buildRoleBudgetView(
  shifts: DraftShift[],
  budgets: { role: string; minutes: number }[],
): RoleBudgetView {
  const hoursByRoleKey = new Map<string, number>();
  for (const shift of shifts) {
    if (shift.staffId === null) continue;
    const key = shift.role.trim().toLowerCase();
    hoursByRoleKey.set(key, (hoursByRoleKey.get(key) ?? 0) + shiftHours(shift.start, shift.end));
  }

  const rows: RoleBudgetRow[] = budgets
    .map((budget) => {
      const budgetHours = budget.minutes / 60;
      const hours = hoursByRoleKey.get(budget.role.trim().toLowerCase()) ?? 0;
      const over = budgetHours > 0 && hours > budgetHours;
      return {
        role: budget.role,
        hours: Math.round(hours * 10) / 10,
        budgetHours,
        over,
        overBy: over ? Math.round((hours - budgetHours) * 10) / 10 : 0,
      };
    })
    // Over-budget roles first, then by how close to the cap.
    .sort((a, b) => Number(b.over) - Number(a.over) || b.hours / (b.budgetHours || 1) - a.hours / (a.budgetHours || 1));

  return { rows, overCount: rows.filter((row) => row.over).length };
}
