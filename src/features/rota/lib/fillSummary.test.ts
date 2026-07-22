import { describe, expect, it } from "vitest";
import { buildFillSummaryMessage } from "./fillSummary";
import type { OpenShiftSuggestion, UnfilledOpenShift } from "./rotaSuggestions";

function suggestion(shiftId: string): OpenShiftSuggestion {
  return {
    shiftId,
    staffId: "a",
    staffName: "Ana",
    role: "Chef",
    dayIndex: 0,
    reason: "Role match",
  };
}

function gap(shiftId: string, reason: string): UnfilledOpenShift {
  return { shiftId, role: "Chef", dayIndex: 0, reason };
}

describe("buildFillSummaryMessage", () => {
  it("reports a clean fill", () => {
    expect(buildFillSummaryMessage({ suggestions: [suggestion("s1")], unfilled: [] })).toBe(
      "1 open shift assigned in the draft. Review before publishing.",
    );
  });

  it("pluralises multiple assignments", () => {
    const result = buildFillSummaryMessage({
      suggestions: [suggestion("s1"), suggestion("s2")],
      unfilled: [],
    });
    expect(result).toContain("2 open shifts assigned");
  });

  it("reports when nothing could be filled", () => {
    expect(buildFillSummaryMessage({ suggestions: [], unfilled: [] })).toBe(
      "No open shifts could be filled.",
    );
  });

  it("names the reasons shifts stayed open", () => {
    const result = buildFillSummaryMessage({
      suggestions: [suggestion("s1")],
      unfilled: [gap("s2", "No active staff hold the Chef role.")],
    });
    expect(result).toContain("1 open shift assigned in the draft.");
    expect(result).toContain("1 still open");
    expect(result).toContain("No active staff hold the Chef role.");
  });

  it("de-duplicates repeated reasons", () => {
    const reason = "No active staff hold the Chef role.";
    const result = buildFillSummaryMessage({
      suggestions: [],
      unfilled: [gap("s1", reason), gap("s2", reason)],
    });
    expect(result).toContain("2 still open");
    expect(result.match(/No active staff/g)).toHaveLength(1);
  });

  it("caps the listed reasons and counts the rest", () => {
    const result = buildFillSummaryMessage({
      suggestions: [],
      unfilled: ["a", "b", "c", "d"].map((key, index) => gap(`s${index}`, `Reason ${key}.`)),
    });
    expect(result).toContain("(+1 more)");
  });

  it("never claims an optimal or complete rota", () => {
    const result = buildFillSummaryMessage({ suggestions: [suggestion("s1")], unfilled: [] });
    expect(result).not.toMatch(/optimal|optimis|complete|perfect|generated/i);
  });
});
