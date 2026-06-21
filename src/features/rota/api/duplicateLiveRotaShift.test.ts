import { describe, expect, it, vi } from "vitest";
import type { ExistingShiftRow } from "./rotaLiveShiftMapping";
import { executeLiveRotaShiftDuplicate } from "./duplicateLiveRotaShift";

function shift(staffId: string | null): ExistingShiftRow {
  return {
    id: "shift-1",
    rota_week_id: "week-1",
    location_id: "location-1",
    department_id: "department-1",
    staff_member_id: staffId,
    shift_date: "2026-06-22",
    starts_at: "2026-06-22T09:00:00Z",
    ends_at: "2026-06-22T17:00:00Z",
    break_minutes: 30,
    role_name: "Chef",
    assignment_status: staffId ? "scheduled" : "open",
  };
}

describe("executeLiveRotaShiftDuplicate", () => {
  it.each(["inactive", "left"])("blocks a %s assignment before insert", async () => {
    const validateAssignment = vi.fn().mockRejectedValue(new Error("not active"));
    const insertCopy = vi.fn();

    await expect(
      executeLiveRotaShiftDuplicate({
        shift: shift("staff-1"),
        validateAssignment,
        insertCopy,
      }),
    ).rejects.toThrow("not active");

    expect(validateAssignment).toHaveBeenCalledWith("staff-1");
    expect(insertCopy).not.toHaveBeenCalled();
  });

  it("inserts an active assignment only after validation passes", async () => {
    const events: string[] = [];
    const validateAssignment = vi.fn().mockImplementation(async () => {
      events.push("validated");
    });
    const insertCopy = vi.fn().mockImplementation(async (source: ExistingShiftRow) => {
      events.push("inserted");
      expect(source.staff_member_id).toBe("staff-1");
      expect(source.assignment_status).toBe("scheduled");
      return "copy-1";
    });

    await expect(
      executeLiveRotaShiftDuplicate({
        shift: shift("staff-1"),
        validateAssignment,
        insertCopy,
      }),
    ).resolves.toBe("copy-1");

    expect(events).toEqual(["validated", "inserted"]);
  });

  it("inserts an open shift without assigned-staff validation", async () => {
    const validateAssignment = vi.fn();
    const insertCopy = vi.fn().mockImplementation(async (source: ExistingShiftRow) => {
      expect(source.staff_member_id).toBeNull();
      expect(source.assignment_status).toBe("open");
      return "copy-open";
    });

    await expect(
      executeLiveRotaShiftDuplicate({
        shift: shift(null),
        validateAssignment,
        insertCopy,
      }),
    ).resolves.toBe("copy-open");

    expect(validateAssignment).not.toHaveBeenCalled();
    expect(insertCopy).toHaveBeenCalledTimes(1);
  });
});
