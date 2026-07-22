import { describe, expect, it } from "vitest";
import { withApprovedLeaveConflictStatus } from "@/features/leave/lib/leaveRotaConflicts";
import type { LeaveRequest } from "@/features/leave/types";
import type { DraftShift, StaffMember } from "../types";
import { makeDraftShift } from "./draftRota";
import {
  buildRepeatShiftFeedback,
  executeRepeatShiftPlan,
  planAssignableRepeatShift,
  planRepeatShift,
} from "./repeatShift";

const source: DraftShift = {
  id: "shift-1",
  dayIndex: 0,
  staffId: "staff-1",
  role: "Chef",
  start: "09:00",
  end: "17:00",
  breakMinutes: 30,
  tone: "info",
  status: "scheduled",
  departmentId: "events-department",
  deptOverride: "Kitchen",
  colourOverride: "amber",
};

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

describe("planAssignableRepeatShift", () => {
  it("does not produce repeat work for a non-assignable source", () => {
    expect(planAssignableRepeatShift(source, [1], [source], [])).toBeNull();
  });

  it("allows an active assigned source to repeat", () => {
    expect(planAssignableRepeatShift(source, [1], [source], activeStaff)?.inputs).toHaveLength(1);
  });

  it("allows an open source to repeat", () => {
    const openSource: DraftShift = {
      ...source,
      staffId: null,
      status: "open",
      tone: "open",
    };

    expect(planAssignableRepeatShift(openSource, [1], [openSource], [])?.inputs).toHaveLength(1);
  });
});

describe("planRepeatShift", () => {
  it("preserves local department and colour overrides in repeat inputs", () => {
    const plan = planRepeatShift(source, [1], [source]);

    expect(plan.inputs[0]).toMatchObject({
      dayIndex: 1,
      staffId: "staff-1",
      role: "Chef",
      start: "09:00",
      end: "17:00",
      breakMinutes: 30,
      deptOverride: "Kitchen",
      colourOverride: "amber",
    });
  });

  it("repeats into the shift's own department, not the staff member's", () => {
    // The source sits in Events even though its owner's profile is elsewhere;
    // every repeat must land in Events too.
    const plan = planRepeatShift(source, [1, 2], [source]);

    expect(plan.inputs.map((input) => input.departmentId)).toEqual([
      "events-department",
      "events-department",
    ]);
  });

  it("passes an explicit null when the source has no department yet", () => {
    const plan = planRepeatShift({ ...source, departmentId: undefined }, [1], [source]);

    expect(plan.inputs[0]!.departmentId).toBeNull();
  });

  it("does not block a named repeat because of an unrelated open shift", () => {
    const openShift: DraftShift = {
      ...source,
      id: "open-1",
      dayIndex: 1,
      staffId: null,
      status: "open",
      tone: "open",
    };

    const plan = planRepeatShift(source, [1], [source, openShift]);

    expect(plan.inputs).toHaveLength(1);
    expect(plan.skippedCount).toBe(0);
  });

  it("skips an overlapping shift for the same named staff member", () => {
    const collision: DraftShift = { ...source, id: "collision", dayIndex: 1 };

    const plan = planRepeatShift(source, [1], [source, collision]);

    expect(plan.inputs).toHaveLength(0);
    expect(plan.skippedCount).toBe(1);
  });

  it("avoids duplicate identical open shifts", () => {
    const openSource: DraftShift = {
      ...source,
      staffId: null,
      status: "open",
      tone: "open",
    };
    const duplicate = { ...openSource, id: "open-duplicate", dayIndex: 1 } as DraftShift;

    const plan = planRepeatShift(openSource, [1], [openSource, duplicate]);

    expect(plan.inputs).toHaveLength(0);
    expect(plan.skippedCount).toBe(1);
  });
});

describe("executeRepeatShiftPlan", () => {
  it("counts successful, skipped, and failed repeats separately", async () => {
    const plan = planRepeatShift(
      source,
      [1, 2, 3],
      [source, { ...source, id: "collision", dayIndex: 2 }],
    );

    const result = await executeRepeatShiftPlan(plan, async (input) => {
      if (input.dayIndex === 3) throw new Error("save failed");
    });

    expect(result).toEqual({ successCount: 1, skippedCount: 1, failedCount: 1 });
  });

  it("allows a repeated shift to enter the existing approved-leave conflict flow", () => {
    const [input] = planRepeatShift(source, [1], [source]).inputs;
    const repeated = makeDraftShift(input!);
    const leave = {
      id: "leave-1",
      staffId: "staff-1",
      state: "approved",
      startIso: "2026-07-07",
      endIso: "2026-07-07",
    } as LeaveRequest;

    const [withConflict] = withApprovedLeaveConflictStatus(
      [repeated],
      [leave],
      ["2026-07-06", "2026-07-07"],
    );

    expect(withConflict).toMatchObject({ status: "conflict", tone: "danger" });
  });
});

describe("buildRepeatShiftFeedback", () => {
  it("reports full success honestly", () => {
    expect(
      buildRepeatShiftFeedback({ successCount: 2, skippedCount: 0, failedCount: 0 }),
    ).toMatchObject({ tone: "success", title: "Shift repeated on 2 days" });
  });

  it("reports partial success with skips and failures", () => {
    const feedback = buildRepeatShiftFeedback({
      successCount: 1,
      skippedCount: 1,
      failedCount: 1,
    });

    expect(feedback.tone).toBe("warning");
    expect(feedback.description).toContain("1 skipped");
    expect(feedback.description).toContain("1 failed");
  });

  it("reports partial success with collision skips", () => {
    const feedback = buildRepeatShiftFeedback({
      successCount: 2,
      skippedCount: 1,
      failedCount: 0,
    });

    expect(feedback.tone).toBe("warning");
    expect(feedback.title).toBe("Shift repeated on 2 days");
    expect(feedback.description).toContain("1 skipped");
  });

  it("reports zero success without implying copies were created", () => {
    expect(
      buildRepeatShiftFeedback({ successCount: 0, skippedCount: 0, failedCount: 2 }),
    ).toMatchObject({
      tone: "error",
      title: "Shift repeat failed",
    });
  });

  it("reports collision-only zero success as no shifts repeated", () => {
    expect(
      buildRepeatShiftFeedback({ successCount: 0, skippedCount: 2, failedCount: 0 }),
    ).toMatchObject({
      tone: "warning",
      title: "No shifts repeated",
    });
  });
});
