import { describe, expect, it, vi } from "vitest";
import type { DraftShift, StaffMember } from "../types";
import { executeDuplicateShiftCopy, executeRepeatShiftCopy } from "./shiftCopyActions";

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

function shift(staffId: string | null): DraftShift {
  return {
    id: "shift-1",
    dayIndex: 0,
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
