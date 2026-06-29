import { describe, expect, it } from "vitest";
import { mapPublishedSnapshotToPortalShifts } from "./portalRota";

describe("mapPublishedSnapshotToPortalShifts split days", () => {
  it("keeps multiple shifts on the same day as separate ordered staff shifts", () => {
    const result = mapPublishedSnapshotToPortalShifts(
      {
        workspaceId: "workspace-1",
        weekKey: "2026-06-08",
        weekStart: "2026-06-08",
        weekLabel: "8-14 Jun",
        version: 1,
        publishedAt: "2026-06-08T09:00:00.000Z",
        publishedBy: { id: "manager-1", name: "Manager" },
        shifts: [
          {
            id: "dinner",
            dayIndex: 0,
            date: "2026-06-08",
            dayLabel: "Mon 8 Jun",
            staffId: "staff-1",
            staffName: "Ana",
            staffInitials: "A",
            role: "Bar",
            start: "17:00",
            end: "22:00",
            location: "Main",
            breakMinutes: 30,
            status: "scheduled",
          },
          {
            id: "breakfast",
            dayIndex: 0,
            date: "2026-06-08",
            dayLabel: "Mon 8 Jun",
            staffId: "staff-1",
            staffName: "Ana",
            staffInitials: "A",
            role: "Bar",
            start: "08:00",
            end: "12:00",
            location: "Main",
            breakMinutes: 0,
            status: "scheduled",
          },
        ],
      },
      "staff-1",
    ).sort((a, b) => `${a.date} ${a.start}`.localeCompare(`${b.date} ${b.start}`));

    expect(result.map((item) => item.id)).toEqual(["breakfast", "dinner"]);
  });
});
