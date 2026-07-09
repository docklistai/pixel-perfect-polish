import { describe, expect, it } from "vitest";
import { captureInversePatch, patchChangesShift } from "./rotaHistory";
import type { DraftShift } from "../types";

function shift(partial: Partial<DraftShift> = {}): DraftShift {
  return {
    id: "s1",
    dayIndex: 0,
    staffId: "olivia",
    role: "Waiter",
    start: "09:00",
    end: "17:00",
    breakMinutes: 30,
    tone: "info",
    status: "scheduled",
    ...partial,
  };
}

describe("captureInversePatch", () => {
  it("captures the pre-edit values of the fields a patch touches", () => {
    const inverse = captureInversePatch(shift(), { start: "10:00", end: "18:00" });
    expect(inverse).toEqual({ start: "09:00", end: "17:00" });
  });

  it("inverts mark-open by restoring the previous assignment", () => {
    const inverse = captureInversePatch(shift({ staffId: "olivia" }), {
      staffId: null,
      status: "open",
      tone: "open",
    });
    expect(inverse).toEqual({ staffId: "olivia", status: "scheduled", tone: "info" });
  });

  it("inverts setting an override by clearing it (restores undefined)", () => {
    const inverse = captureInversePatch(shift(), { colourOverride: "teal" });
    expect(inverse).toHaveProperty("colourOverride", undefined);
  });

  it("ignores non-reversible keys like id or dayIndex", () => {
    const inverse = captureInversePatch(shift(), { id: "x", start: "10:00" } as Partial<DraftShift>);
    expect(inverse).toEqual({ start: "09:00" });
  });
});

describe("patchChangesShift", () => {
  it("detects a real change and a no-op", () => {
    expect(patchChangesShift(shift(), { start: "10:00" })).toBe(true);
    expect(patchChangesShift(shift(), { start: "09:00" })).toBe(false);
  });
});
