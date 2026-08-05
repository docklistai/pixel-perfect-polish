import { describe, expect, it } from "vitest";
import { initialOpsEntryDraft } from "../lib/opsEntryDraft";
import type { OpsEntry, OpsLocation } from "../types";

const location = [{ id: "location-1", name: "Venue", timezone: "Europe/London" }] as OpsLocation[];

describe("Ops log-entry initialization", () => {
  it("persists rota-shift prefill without crossing into unrelated defaults", () => {
    expect(
      initialOpsEntryDraft(location, {
        locationId: "location-1",
        rotaWeekId: "week-1",
        shiftId: "shift-1",
        staffMemberId: "staff-1",
        departmentId: "department-1",
      }),
    ).toMatchObject({
      locationId: "location-1",
      rotaWeekId: "week-1",
      shiftId: "shift-1",
      subjectStaffMemberId: "staff-1",
      assignedStaffMemberId: "staff-1",
      departmentId: "department-1",
    });
  });

  it("retains the edited assignee in the update draft", () => {
    const edited = {
      id: "entry-1",
      entryType: "task",
      assignedStaffMemberId: "staff-2",
      locationId: "location-1",
      title: "Close down",
    } as OpsEntry;
    expect(initialOpsEntryDraft(location, {}, edited).assignedStaffMemberId).toBe("staff-2");
  });
});
