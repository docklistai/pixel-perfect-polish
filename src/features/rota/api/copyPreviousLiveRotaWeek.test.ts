import { describe, expect, it, vi } from "vitest";
import {
  applyLiveCopyRows,
  buildLiveCopyPreview,
  buildLiveCopyRows,
  type LiveCopyInsertShiftRow,
  type LiveCopySourceShiftRow,
} from "./copyPreviousLiveRotaWeek";

function sourceShift(overrides: Partial<LiveCopySourceShiftRow> = {}): LiveCopySourceShiftRow {
  return {
    location_id: "location-previous",
    department_id: "department-1",
    staff_member_id: "staff-1",
    shift_date: "2026-06-22",
    starts_at: "2026-06-22T09:00:00Z",
    ends_at: "2026-06-22T17:00:00Z",
    break_minutes: 30,
    role_name: "Waiter",
    assignment_status: "scheduled",
    ...overrides,
  };
}

function currentShift(overrides: Partial<LiveCopyInsertShiftRow> = {}): LiveCopyInsertShiftRow {
  return {
    id: "current-1",
    workspace_id: "workspace-1",
    rota_week_id: "week-current",
    location_id: "location-current",
    department_id: "department-1",
    staff_member_id: "staff-current",
    shift_date: "2026-06-29",
    starts_at: "2026-06-29T09:00:00Z",
    ends_at: "2026-06-29T17:00:00Z",
    break_minutes: 30,
    role_name: "Waiter",
    assignment_status: "scheduled",
    ...overrides,
  };
}

function copyRows(
  sourceRows: LiveCopySourceShiftRow[] = [sourceShift()],
): LiveCopyInsertShiftRow[] {
  return buildLiveCopyRows({
    sourceRows,
    workspaceId: "workspace-1",
    targetWeekId: "week-current",
    targetLocationId: "location-current",
    previousWeekStart: "2026-06-22",
    targetWeekStart: "2026-06-29",
    timezone: "UTC",
  });
}

describe("buildLiveCopyPreview", () => {
  it("summarises what will be copied and replaced before apply", () => {
    const preview = buildLiveCopyPreview({
      sourceRows: [
        sourceShift(),
        sourceShift({ staff_member_id: null, assignment_status: "open" }),
      ],
      currentShiftCount: 3,
      previousWeekStart: "2026-06-22",
      targetWeekStart: "2026-06-29",
    });

    expect(preview).toMatchObject({
      sourceShiftCount: 2,
      currentShiftCount: 3,
      assignedShiftCount: 1,
      openShiftCount: 1,
    });
    expect(preview.previousWeekLabel).toContain("22");
    expect(preview.previousWeekLabel).toContain("28 Jun");
    expect(preview.targetWeekLabel).toContain("29 Jun");
    expect(preview.targetWeekLabel).toContain("5 Jul");
  });
});

describe("applyLiveCopyRows", () => {
  it("does not delete the current week when the copy payload is invalid or empty", async () => {
    const deleteCurrentRows = vi.fn();

    await expect(
      applyLiveCopyRows({
        nextRows: [],
        currentRows: [currentShift()],
        deleteCurrentRows,
        insertRows: vi.fn(),
        restoreRows: vi.fn(),
      }),
    ).rejects.toThrow("Previous week has no shifts to copy");

    expect(deleteCurrentRows).not.toHaveBeenCalled();
  });

  it("restores the current draft and rejects when inserting copied shifts fails", async () => {
    const currentRows = [currentShift()];
    const deleteCurrentRows = vi.fn().mockResolvedValue(undefined);
    const insertRows = vi.fn().mockRejectedValue(new Error("insert failed"));
    const restoreRows = vi.fn().mockResolvedValue(undefined);

    await expect(
      applyLiveCopyRows({
        nextRows: copyRows(),
        currentRows,
        deleteCurrentRows,
        insertRows,
        restoreRows,
      }),
    ).rejects.toThrow("The original draft was restored");

    expect(deleteCurrentRows).toHaveBeenCalledTimes(1);
    expect(insertRows).toHaveBeenCalledTimes(1);
    expect(restoreRows).toHaveBeenCalledWith(currentRows);
  });

  it("surfaces a hard failure when copied insert and rollback both fail", async () => {
    await expect(
      applyLiveCopyRows({
        nextRows: copyRows(),
        currentRows: [currentShift()],
        deleteCurrentRows: vi.fn().mockResolvedValue(undefined),
        insertRows: vi.fn().mockRejectedValue(new Error("insert failed")),
        restoreRows: vi.fn().mockRejectedValue(new Error("restore failed")),
      }),
    ).rejects.toThrow("original draft could not be restored");
  });
});
