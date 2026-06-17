import { describe, it, expect } from "vitest";
import { applyShiftPatch, isRotaDayIndex } from "./draftShiftCore";
import type { DraftShift } from "../types";

const openShift: DraftShift = {
  id: "s1",
  dayIndex: 0,
  staffId: null,
  role: "Chef",
  start: "09:00",
  end: "17:00",
  breakMinutes: 30,
  tone: "open",
  status: "open",
};

describe("applyShiftPatch status/tone reconciliation", () => {
  it("flips an open shift to scheduled when a staff member is assigned", () => {
    const next = applyShiftPatch(openShift, { staffId: "a" });
    expect(next.status).toBe("scheduled");
    expect(next.tone).toBe("info");
  });

  it("flips a scheduled shift back to open when the staff member is removed", () => {
    const scheduled = applyShiftPatch(openShift, { staffId: "a" });
    const reopened = applyShiftPatch(scheduled, { staffId: null });
    expect(reopened.status).toBe("open");
    expect(reopened.tone).toBe("open");
  });

  it("does not overwrite an explicit non-open tone when assigning", () => {
    const next = applyShiftPatch(openShift, { staffId: "a", tone: "success" });
    expect(next.status).toBe("scheduled");
    expect(next.tone).toBe("success");
  });
});

describe("isRotaDayIndex", () => {
  it("accepts integers 0..6", () => {
    expect([0, 1, 2, 3, 4, 5, 6].every(isRotaDayIndex)).toBe(true);
  });

  it("rejects out-of-range and non-integers", () => {
    expect(isRotaDayIndex(7)).toBe(false);
    expect(isRotaDayIndex(-1)).toBe(false);
    expect(isRotaDayIndex(3.5)).toBe(false);
  });
});
