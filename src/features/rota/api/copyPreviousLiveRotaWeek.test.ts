import { describe, expect, it } from "vitest";
import { buildLiveCopyPreview, type LiveCopySourceShiftRow } from "./copyPreviousLiveRotaWeek";

function sourceShift(overrides: Partial<LiveCopySourceShiftRow> = {}): LiveCopySourceShiftRow {
  return {
    location_id: "loc-1",
    department_id: "dept-1",
    staff_member_id: "staff-1",
    shift_date: "2026-06-08",
    starts_at: "2026-06-08T08:00:00Z",
    ends_at: "2026-06-08T16:00:00Z",
    break_minutes: 30,
    role_name: "Waiter",
    assignment_status: "scheduled",
    ...overrides,
  };
}

// Atomicity of the copy itself now lives in the database
// (rpc_copy_previous_rota_week — covered by the phase 40 SQL suite).

describe("buildLiveCopyPreview", () => {
  it("summarises source, current, assigned, and open counts with week labels", () => {
    const preview = buildLiveCopyPreview({
      sourceRows: [
        sourceShift(),
        sourceShift({ staff_member_id: null, assignment_status: "open" }),
        sourceShift({ staff_member_id: "staff-2" }),
      ],
      currentShiftCount: 4,
      previousWeekStart: "2026-06-08",
      targetWeekStart: "2026-06-15",
    });

    expect(preview.sourceShiftCount).toBe(3);
    expect(preview.currentShiftCount).toBe(4);
    expect(preview.assignedShiftCount).toBe(2);
    expect(preview.openShiftCount).toBe(1);
    expect(preview.previousWeekStart).toBe("2026-06-08");
    expect(preview.targetWeekStart).toBe("2026-06-15");
    expect(preview.previousWeekLabel).toContain("Jun");
    expect(preview.targetWeekLabel).toContain("Jun");
  });

  it("refuses to preview an empty source week", () => {
    expect(() =>
      buildLiveCopyPreview({
        sourceRows: [],
        currentShiftCount: 0,
        previousWeekStart: "2026-06-08",
        targetWeekStart: "2026-06-15",
      }),
    ).toThrow("Previous week has no shifts to copy.");
  });
});
