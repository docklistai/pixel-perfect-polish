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

  it("ignores keys that are not reversible, such as id", () => {
    const inverse = captureInversePatch(shift(), {
      id: "x",
      start: "10:00",
    } as Partial<DraftShift>);
    expect(inverse).toEqual({ start: "09:00" });
  });

  // A shift moved between days is undone by moving it back, so `dayIndex` has
  // to be reversible. While it was not, a day-only move captured an EMPTY
  // inverse — and replaying an empty patch is refused by `updateShiftInput`, so
  // Undo reported an error instead of moving the shift back.
  it("captures the original day of a day-only move", () => {
    const inverse = captureInversePatch(shift({ dayIndex: 2 }), { dayIndex: 5 });
    expect(inverse).toEqual({ dayIndex: 2 });
  });

  it("never produces an empty inverse for a day-only move", () => {
    const inverse = captureInversePatch(shift({ dayIndex: 0 }), { dayIndex: 6 });
    expect(Object.keys(inverse)).toHaveLength(1);
  });

  it("restores day 0, which must not be dropped as falsy", () => {
    const inverse = captureInversePatch(shift({ dayIndex: 0 }), { dayIndex: 3 });
    expect(inverse).toHaveProperty("dayIndex", 0);
  });

  it("inverts a diagonal move in one patch", () => {
    const inverse = captureInversePatch(shift({ dayIndex: 1, staffId: "olivia" }), {
      dayIndex: 4,
      staffId: "sam",
    });
    expect(inverse).toEqual({ dayIndex: 1, staffId: "olivia" });
  });

  it("round-trips: applying the inverse then the patch returns the original", () => {
    const original = shift({ dayIndex: 2, staffId: "olivia" });
    const patch: Partial<DraftShift> = { dayIndex: 5, staffId: null };
    const inverse = captureInversePatch(original, patch);

    const moved = { ...original, ...patch };
    const undone = { ...moved, ...inverse };
    expect(undone).toEqual(original);
    expect({ ...undone, ...patch }).toEqual(moved);
  });
});

describe("patchChangesShift", () => {
  it("detects a real change and a no-op", () => {
    expect(patchChangesShift(shift(), { start: "10:00" })).toBe(true);
    expect(patchChangesShift(shift(), { start: "09:00" })).toBe(false);
  });

  // The history hook skips recording when this is false, which is what stops a
  // drop back onto the source cell spending an Undo on nothing.
  it("detects a day move, and rejects a move to the same day", () => {
    expect(patchChangesShift(shift({ dayIndex: 2 }), { dayIndex: 3 })).toBe(true);
    expect(patchChangesShift(shift({ dayIndex: 2 }), { dayIndex: 2 })).toBe(false);
  });
});
