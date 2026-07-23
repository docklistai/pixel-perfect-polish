import { describe, expect, it } from "vitest";
import { shiftToInput } from "./rotaHistoryInput";
import { makeDraftShift } from "./draftShiftCore";
import type { DraftShift, RotaDayIndex } from "../types";

function shift(overrides: Partial<DraftShift> = {}): DraftShift {
  return {
    id: "s1",
    dayIndex: 2 as RotaDayIndex,
    staffId: "staff-1",
    role: "Cover",
    start: "12:00",
    end: "20:00",
    breakMinutes: 45,
    tone: "info",
    status: "scheduled",
    ...overrides,
  };
}

describe("shiftToInput — recreate field preservation", () => {
  it("preserves role, times, break and status", () => {
    expect(shiftToInput(shift())).toMatchObject({
      dayIndex: 2,
      staffId: "staff-1",
      role: "Cover",
      start: "12:00",
      end: "20:00",
      breakMinutes: 45,
      status: "scheduled",
      tone: "info",
    });
  });

  it("preserves an explicit department so a cover shift is not re-resolved", () => {
    const input = shiftToInput(shift({ departmentId: "dept-events" }));
    expect(input.departmentId).toBe("dept-events");
  });

  it("preserves the legacy label and colour overrides", () => {
    const input = shiftToInput(shift({ deptOverride: "Events", colourOverride: "preset-3" }));
    expect(input.deptOverride).toBe("Events");
    expect(input.colourOverride).toBe("preset-3");
  });

  it("omits absent overrides rather than sending nulls", () => {
    const input = shiftToInput(shift());
    expect("departmentId" in input).toBe(false);
    expect("deptOverride" in input).toBe(false);
    expect("colourOverride" in input).toBe(false);
  });

  it("keeps an open shift open", () => {
    const input = shiftToInput(shift({ staffId: null, status: "open", tone: "open" }));
    expect(input.staffId).toBeNull();
    expect(input.status).toBe("open");
  });

  it("preserves every authoritative field through the actual local recreate path", () => {
    const original = shift({
      departmentId: "dept-events",
      deptOverride: "Events",
      colourOverride: "preset-3",
      role: "Training",
      start: "08:15",
      end: "16:45",
      breakMinutes: 0,
      status: "scheduled",
    });
    expect(makeDraftShift(shiftToInput(original))).toMatchObject({
      departmentId: "dept-events",
      deptOverride: "Events",
      colourOverride: "preset-3",
      role: "Training",
      start: "08:15",
      end: "16:45",
      breakMinutes: 0,
      status: "scheduled",
    });
  });
});
