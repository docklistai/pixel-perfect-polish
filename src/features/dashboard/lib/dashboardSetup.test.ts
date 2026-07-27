import { describe, it, expect } from "vitest";
import { buildDashboardSetup } from "./dashboardSetup";

describe("buildDashboardSetup", () => {
  it("shows the full workspace setup for a brand-new workspace", () => {
    const plan = buildDashboardSetup({
      staffCount: 0,
      plannedShiftCount: 0,
      hasPublishedSnapshot: false,
      hasLabourTargets: false,
      hasBusinessBasics: false,
    });
    expect(plan.show).toBe(true);
    expect(plan.mode).toBe("workspace");
    expect(plan.doneCount).toBe(0);
    // The optional labour budget comes after building and publishing a rota:
    // scheduling is what the workspace is for, and the budget is not required
    // to do any of it.
    expect(plan.steps.map((step) => step.id)).toEqual([
      "basics",
      "team",
      "rota",
      "publish",
      "budget",
    ]);
    expect(plan.steps.filter((step) => step.optional).map((step) => step.id)).toEqual(["budget"]);
    expect(plan.showAccessCodesHint).toBe(true);
  });

  it("omits the basics step while unknown and once staff exist", () => {
    const unknown = buildDashboardSetup({
      staffCount: 0,
      plannedShiftCount: 0,
      hasPublishedSnapshot: false,
      hasLabourTargets: false,
      hasBusinessBasics: null,
    });
    expect(unknown.steps.some((step) => step.id === "basics")).toBe(false);

    const staffed = buildDashboardSetup({
      staffCount: 4,
      plannedShiftCount: 0,
      hasPublishedSnapshot: false,
      hasLabourTargets: false,
      hasBusinessBasics: false,
    });
    // Basics is a first-run step only — an established team doesn't get nagged.
    expect(staffed.steps.some((step) => step.id === "basics")).toBe(false);
  });

  it("marks the basics step done once opening days are set", () => {
    const plan = buildDashboardSetup({
      staffCount: 0,
      plannedShiftCount: 0,
      hasPublishedSnapshot: false,
      hasLabourTargets: false,
      hasBusinessBasics: true,
    });
    expect(plan.steps.find((step) => step.id === "basics")).toMatchObject({ done: true });
  });

  it("omits the budget step while its state is unknown", () => {
    const plan = buildDashboardSetup({
      staffCount: 0,
      plannedShiftCount: 0,
      hasPublishedSnapshot: false,
      hasLabourTargets: null,
      hasBusinessBasics: null,
    });
    expect(plan.steps.map((step) => step.id)).toEqual(["team", "rota", "publish"]);
  });

  it("marks the budget step done once labour targets are saved", () => {
    const plan = buildDashboardSetup({
      staffCount: 6,
      plannedShiftCount: 0,
      hasPublishedSnapshot: false,
      hasLabourTargets: true,
      hasBusinessBasics: null,
    });
    expect(plan.steps.find((step) => step.id === "budget")).toMatchObject({ done: true });
  });

  it("switches to week mode once staff exist but nothing is drafted", () => {
    const plan = buildDashboardSetup({
      staffCount: 6,
      plannedShiftCount: 0,
      hasPublishedSnapshot: false,
      hasLabourTargets: false,
      hasBusinessBasics: null,
    });
    expect(plan.show).toBe(true);
    expect(plan.mode).toBe("week");
    expect(plan.doneCount).toBe(1);
    expect(plan.steps[0]).toMatchObject({ id: "team", done: true });
    expect(plan.showAccessCodesHint).toBe(false);
  });

  it("hides the panel while a staffed week is being drafted", () => {
    const plan = buildDashboardSetup({
      staffCount: 6,
      plannedShiftCount: 4,
      hasPublishedSnapshot: false,
      hasLabourTargets: false,
      hasBusinessBasics: null,
    });
    expect(plan.show).toBe(false);
  });

  it("never shows the panel because of the budget step alone", () => {
    const plan = buildDashboardSetup({
      staffCount: 6,
      plannedShiftCount: 12,
      hasPublishedSnapshot: true,
      hasLabourTargets: false,
      hasBusinessBasics: null,
    });
    expect(plan.show).toBe(false);
  });

  it("keeps showing setup when staff exist only after an old publish was cleared", () => {
    const plan = buildDashboardSetup({
      staffCount: 6,
      plannedShiftCount: 0,
      hasPublishedSnapshot: true,
      hasLabourTargets: false,
      hasBusinessBasics: null,
    });
    expect(plan.show).toBe(false);
  });

  it("still shows workspace mode when a rota exists but no staff do", () => {
    const plan = buildDashboardSetup({
      staffCount: 0,
      plannedShiftCount: 3,
      hasPublishedSnapshot: false,
      hasLabourTargets: false,
      hasBusinessBasics: null,
    });
    expect(plan.show).toBe(true);
    expect(plan.mode).toBe("workspace");
    expect(plan.steps.find((step) => step.id === "rota")).toMatchObject({ done: true });
  });
});
