import { describe, expect, it } from "vitest";
import { buildRoleBudgetView } from "./roleBudget";
import type { DraftShift } from "../types";

function shift(role: string, staffId: string | null, start: string, end: string): DraftShift {
  return {
    id: `${role}-${start}`,
    dayIndex: 0,
    staffId,
    role,
    start,
    end,
    breakMinutes: 0,
    tone: "info",
    status: staffId ? "scheduled" : "open",
  };
}

describe("buildRoleBudgetView", () => {
  it("sums assigned hours per role and flags roles over budget", () => {
    const shifts = [
      shift("Chef", "a", "09:00", "17:00"), // 8h
      shift("Chef", "b", "09:00", "15:00"), // 6h -> Chef 14h
      shift("Waiter", "c", "12:00", "17:00"), // 5h
    ];
    const view = buildRoleBudgetView(shifts, [
      { role: "chef", minutes: 600 }, // 10h budget -> over by 4
      { role: "Waiter", minutes: 600 }, // 10h budget -> within
    ]);
    expect(view.overCount).toBe(1);
    // Over-budget role sorts first.
    expect(view.rows[0]).toMatchObject({ role: "chef", hours: 14, over: true, overBy: 4 });
    expect(view.rows[1]).toMatchObject({ role: "Waiter", hours: 5, over: false });
  });

  it("ignores open shifts and shows zero for a budgeted role with no shifts", () => {
    const view = buildRoleBudgetView([shift("Chef", null, "09:00", "17:00")], [
      { role: "Chef", minutes: 600 },
    ]);
    expect(view.rows[0]).toMatchObject({ role: "Chef", hours: 0, over: false });
    expect(view.overCount).toBe(0);
  });
});
