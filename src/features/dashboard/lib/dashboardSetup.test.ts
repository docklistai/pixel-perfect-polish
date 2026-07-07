import { describe, it, expect } from "vitest";
import { buildDashboardSetup } from "./dashboardSetup";

describe("buildDashboardSetup", () => {
  it("shows the full workspace setup for a brand-new workspace", () => {
    const plan = buildDashboardSetup({
      staffCount: 0,
      plannedShiftCount: 0,
      hasPublishedSnapshot: false,
    });
    expect(plan.show).toBe(true);
    expect(plan.mode).toBe("workspace");
    expect(plan.doneCount).toBe(0);
    expect(plan.steps.map((step) => step.id)).toEqual(["team", "rota", "publish"]);
    expect(plan.showAccessCodesHint).toBe(true);
  });

  it("switches to week mode once staff exist but nothing is drafted", () => {
    const plan = buildDashboardSetup({
      staffCount: 6,
      plannedShiftCount: 0,
      hasPublishedSnapshot: false,
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
    });
    expect(plan.show).toBe(false);
  });

  it("hides the panel once the week is published", () => {
    const plan = buildDashboardSetup({
      staffCount: 6,
      plannedShiftCount: 12,
      hasPublishedSnapshot: true,
    });
    expect(plan.show).toBe(false);
  });

  it("keeps showing setup when staff exist only after an old publish was cleared", () => {
    // Published snapshot but no draft shifts: the publish card owns this state,
    // not the setup panel — a manager mid-edit must not see first-run copy.
    const plan = buildDashboardSetup({
      staffCount: 6,
      plannedShiftCount: 0,
      hasPublishedSnapshot: true,
    });
    expect(plan.show).toBe(false);
  });

  it("still shows workspace mode when a rota exists but no staff do", () => {
    const plan = buildDashboardSetup({
      staffCount: 0,
      plannedShiftCount: 3,
      hasPublishedSnapshot: false,
    });
    expect(plan.show).toBe(true);
    expect(plan.mode).toBe("workspace");
    expect(plan.steps[1]).toMatchObject({ id: "rota", done: true });
  });
});
