import { describe, expect, it } from "vitest";
import { buildLabourTargetsPayload, labourFieldsFromSettings } from "./labourTargets";

describe("labourFieldsFromSettings", () => {
  it("returns empty fields with the default warning threshold when nothing is saved", () => {
    expect(labourFieldsFromSettings(null)).toEqual({
      weeklyBudgetHours: "",
      dailyBudgetHours: "",
      targetLabourPct: "",
      forecastWeeklySales: "",
      avgHourlyCost: "",
      budgetWarningPct: "95",
    });
  });

  it("formats minutes as hours and pence as pounds", () => {
    expect(
      labourFieldsFromSettings({
        weeklyBudgetMinutes: 49230,
        dailyBudgetMinutes: 7200,
        targetLabourPct: 30,
        forecastWeeklySalesPence: 1780000,
        avgHourlyCostPence: 1320,
        budgetWarningPct: 90,
      }),
    ).toEqual({
      weeklyBudgetHours: "820.5",
      dailyBudgetHours: "120",
      targetLabourPct: "30",
      forecastWeeklySales: "17800",
      avgHourlyCost: "13.20",
      budgetWarningPct: "90",
    });
  });
});

describe("buildLabourTargetsPayload", () => {
  const base = {
    weeklyBudgetHours: "820",
    dailyBudgetHours: "120",
    targetLabourPct: "30",
    forecastWeeklySales: "£17,800",
    avgHourlyCost: "13.20",
    budgetWarningPct: "95",
  };

  it("converts hours to minutes and pounds to pence", () => {
    expect(buildLabourTargetsPayload(base)).toEqual({
      ok: true,
      payload: {
        weeklyBudgetMinutes: 49200,
        dailyBudgetMinutes: 7200,
        targetLabourPct: 30,
        forecastWeeklySalesPence: 1780000,
        avgHourlyCostPence: 1320,
        budgetWarningPct: 95,
      },
    });
  });

  it("treats blank fields as unset", () => {
    const result = buildLabourTargetsPayload({
      weeklyBudgetHours: "",
      dailyBudgetHours: "",
      targetLabourPct: "",
      forecastWeeklySales: "",
      avgHourlyCost: "",
      budgetWarningPct: "95",
    });
    expect(result).toEqual({
      ok: true,
      payload: {
        weeklyBudgetMinutes: null,
        dailyBudgetMinutes: null,
        targetLabourPct: null,
        forecastWeeklySalesPence: null,
        avgHourlyCostPence: null,
        budgetWarningPct: 95,
      },
    });
  });

  it.each([
    [{ ...base, weeklyBudgetHours: "abc" }, /weekly hours budget/i],
    [{ ...base, dailyBudgetHours: "abc" }, /daily hours budget/i],
    [{ ...base, targetLabourPct: "140" }, /labour %/i],
    [{ ...base, forecastWeeklySales: "-5" }, /sales/i],
    [{ ...base, avgHourlyCost: "20000" }, /hourly cost/i],
    [{ ...base, budgetWarningPct: "10" }, /threshold/i],
  ])("rejects invalid input %#", (fields, message) => {
    const result = buildLabourTargetsPayload(fields);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(message);
  });
});
