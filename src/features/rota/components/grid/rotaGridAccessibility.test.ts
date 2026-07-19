import { describe, expect, it } from "vitest";
import type { DraftShift } from "../../types";
import {
  buildRotaCellAccessibleName,
  inlineEditorAccessibleName,
  nextRotaGridPosition,
} from "./rotaGridAccessibility";

function shift(overrides: Partial<DraftShift> = {}): DraftShift {
  return {
    id: "shift-1",
    dayIndex: 0,
    staffId: "staff-1",
    role: "Chef",
    start: "09:00",
    end: "17:00",
    breakMinutes: 30,
    tone: "info",
    status: "scheduled",
    ...overrides,
  };
}

describe("rota grid accessibility", () => {
  it.each([
    ["ArrowRight", { rowIndex: 2, dayIndex: 4 }],
    ["ArrowLeft", { rowIndex: 2, dayIndex: 2 }],
    ["ArrowUp", { rowIndex: 1, dayIndex: 3 }],
    ["ArrowDown", { rowIndex: 3, dayIndex: 3 }],
  ] as const)("maps %s to the adjacent cell", (key, expected) => {
    expect(nextRotaGridPosition(2, 3, key)).toEqual(expected);
  });

  it("names the staff, date, shift, time, state and actions", () => {
    const accessibleName = buildRotaCellAccessibleName({
      cellLabel: "Asha Khan, Monday 13 July",
      shifts: [shift({ status: "conflict", edited: true })],
      readOnly: false,
    });

    expect(accessibleName).toContain("Asha Khan, Monday 13 July: Chef shift");
    expect(accessibleName).toContain("9am");
    expect(accessibleName).toContain("5pm");
    expect(accessibleName).toContain("conflict, edited in draft");
    expect(accessibleName).toContain("Enter or Space");
  });

  it("names the inline editor with staff and date context plus instructions", () => {
    const name = inlineEditorAccessibleName("Asha Khan, Monday 13 July");

    expect(name).toContain("Edit shift for Asha Khan, Monday 13 July");
    expect(name).toContain("Enter to save");
    expect(name).toContain("Escape to cancel");
  });

  it("announces constraints on empty cells", () => {
    expect(
      buildRotaCellAccessibleName({
        cellLabel: "Asha Khan, Tuesday 14 July",
        shifts: [],
        readOnly: false,
        availabilityHint: "day-off",
      }),
    ).toBe(
      "Asha Khan, Tuesday 14 July: Approved recurring day off. Press Enter or Space to add a shift.",
    );
  });
});
