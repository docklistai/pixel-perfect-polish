import { describe, it, expect } from "vitest";
import { buildRotaIssues } from "./rotaIssues";
import type { ConflictSummary, WorkingTimeAlert } from "../types";

const conflict: ConflictSummary = {
  id: "shift-1",
  staff: "Ana",
  day: "Mon",
  detail: "Double booked",
  cause: "Two shifts overlap",
  guidance: "Move one shift",
};

const alert: WorkingTimeAlert = {
  staffId: "a",
  staffName: "Ben",
  scheduledDays: 6,
};

describe("buildRotaIssues", () => {
  it("returns an empty list when there are no conflicts or alerts", () => {
    expect(buildRotaIssues([], [])).toEqual([]);
  });

  it("maps conflicts to danger issues carrying the shift id", () => {
    const issues = buildRotaIssues([conflict], []);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({
      id: "conflict-shift-1",
      tone: "danger",
      shiftId: "shift-1",
    });
    expect(issues[0].title).toContain("Ana");
    expect(issues[0].why).toBe(conflict.cause);
  });

  it("maps working-time alerts to warning issues without a shift id", () => {
    const issues = buildRotaIssues([], [alert]);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ id: "working-time-a", tone: "warning" });
    expect(issues[0].shiftId).toBeUndefined();
    expect(issues[0].why).toContain("6 days");
  });

  it("orders conflicts before working-time alerts", () => {
    const issues = buildRotaIssues([conflict], [alert]);
    expect(issues.map((i) => i.tone)).toEqual(["danger", "warning"]);
  });
});
