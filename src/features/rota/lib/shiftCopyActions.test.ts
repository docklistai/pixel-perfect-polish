import { describe, expect, it, vi } from "vitest";
import type { DraftShift, StaffMember } from "../types";
import { executeDuplicateShiftCopy, executeRepeatShiftCopy } from "./shiftCopyActions";
import { LAST_DAY_DUPLICATE_BLOCKED_REASON } from "./duplicateShiftRules";

const activeStaff: StaffMember[] = [
  {
    id: "staff-1",
    name: "Sam Rivers",
    role: "Chef",
    hrs: "40h",
    img: 1,
    tone: "info",
  },
];

function shift(staffId: string | null, dayIndex = 0): DraftShift {
  return {
    id: "shift-1",
    dayIndex: dayIndex as DraftShift["dayIndex"],
    staffId,
    role: "Chef",
    start: "09:00",
    end: "17:00",
    breakMinutes: 30,
    tone: staffId ? "info" : "open",
    status: staffId ? "scheduled" : "open",
  };
}

describe("executeDuplicateShiftCopy", () => {
  it.each(["inactive", "left", "missing"])(
    "does not invoke duplicate work for a %s assignment",
    async (staffId) => {
      const duplicate = vi.fn();

      const result = await executeDuplicateShiftCopy(shift(staffId), activeStaff, duplicate);

      expect(result.status).toBe("blocked");
      expect(duplicate).not.toHaveBeenCalled();
    },
  );

  it.each([
    ["active assigned", shift("staff-1")],
    ["open", shift(null)],
  ])("allows an %s shift to duplicate", async (_label, source) => {
    const duplicate = vi.fn().mockResolvedValue("copy-1");

    await expect(executeDuplicateShiftCopy(source, activeStaff, duplicate)).resolves.toEqual({
      status: "completed",
      shiftId: "copy-1",
    });
    expect(duplicate).toHaveBeenCalledWith("shift-1");
  });

  // This is the single gate both the draft store and the live rota go through,
  // so blocking here is what makes the last-day rule true in both modes.
  it.each([
    ["assigned", "staff-1"],
    ["open", null],
  ])("blocks a final-day %s shift instead of copying it onto itself", async (_label, staffId) => {
    const duplicate = vi.fn();

    const result = await executeDuplicateShiftCopy(shift(staffId, 6), activeStaff, duplicate);

    expect(result).toEqual({ status: "blocked", reason: LAST_DAY_DUPLICATE_BLOCKED_REASON });
    expect(duplicate).not.toHaveBeenCalled();
  });

  it("still allows Saturday, the last day that has a next day", async () => {
    const duplicate = vi.fn().mockResolvedValue("copy-1");

    const result = await executeDuplicateShiftCopy(shift("staff-1", 5), activeStaff, duplicate);

    expect(result.status).toBe("completed");
    expect(duplicate).toHaveBeenCalledTimes(1);
  });
});

describe("executeRepeatShiftCopy", () => {
  it.each(["inactive", "left", "missing"])(
    "does not execute repeat work for a %s assignment",
    async (staffId) => {
      const addShift = vi.fn();

      const result = await executeRepeatShiftCopy({
        source: shift(staffId),
        dayIndexes: [1],
        shifts: [shift(staffId)],
        assignableStaff: activeStaff,
        addShift,
      });

      expect(result.status).toBe("blocked");
      expect(addShift).not.toHaveBeenCalled();
    },
  );

  it.each([
    ["active assigned", shift("staff-1")],
    ["open", shift(null)],
  ])("allows an %s shift to repeat", async (_label, source) => {
    const addShift = vi.fn();

    const result = await executeRepeatShiftCopy({
      source,
      dayIndexes: [1],
      shifts: [source],
      assignableStaff: activeStaff,
      addShift,
    });

    expect(result).toMatchObject({
      status: "completed",
      result: { successCount: 1, skippedCount: 0, failedCount: 0 },
    });
    expect(addShift).toHaveBeenCalledTimes(1);
  });
});
