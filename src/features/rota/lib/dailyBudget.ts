/**
 * Per-day labour budget view for the rota. Compares each day's scheduled hours
 * against the workspace daily hours budget so a manager can catch a single
 * overstaffed day while building the week. Pure and presentation-agnostic.
 */

export type DailyBudgetDay = {
  label: string;
  hours: number;
  over: boolean;
  /** Hours over the daily budget (0 when within). */
  overBy: number;
};

export type DailyBudgetView = {
  budgetHours: number;
  days: DailyBudgetDay[];
  overCount: number;
};

export function buildDailyBudgetView(
  days: { d: string; hours: number }[],
  dailyBudgetMinutes: number,
): DailyBudgetView {
  const budgetHours = dailyBudgetMinutes / 60;
  const viewDays: DailyBudgetDay[] = days.map((day) => {
    const over = budgetHours > 0 && day.hours > budgetHours;
    return {
      label: day.d,
      hours: day.hours,
      over,
      overBy: over ? Math.round((day.hours - budgetHours) * 10) / 10 : 0,
    };
  });
  return {
    budgetHours,
    days: viewDays,
    overCount: viewDays.filter((day) => day.over).length,
  };
}
