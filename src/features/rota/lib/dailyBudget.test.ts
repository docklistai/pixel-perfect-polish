import { describe, expect, it } from "vitest";
import { buildDailyBudgetView } from "./dailyBudget";

const days = [
  { d: "Mon", hours: 30 },
  { d: "Tue", hours: 44 },
  { d: "Wed", hours: 40 },
];

describe("buildDailyBudgetView", () => {
  it("flags days over the daily budget and counts them", () => {
    const view = buildDailyBudgetView(days, 2400); // 40h
    expect(view.budgetHours).toBe(40);
    expect(view.overCount).toBe(1);
    expect(view.days[1]).toMatchObject({ label: "Tue", over: true, overBy: 4 });
    expect(view.days[0]!.over).toBe(false);
    // Exactly on budget is not over.
    expect(view.days[2]!.over).toBe(false);
  });

  it("treats a zero budget as no comparison", () => {
    const view = buildDailyBudgetView(days, 0);
    expect(view.overCount).toBe(0);
    expect(view.days.every((day) => day.over === false)).toBe(true);
  });
});
