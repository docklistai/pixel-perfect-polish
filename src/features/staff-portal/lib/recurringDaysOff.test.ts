import { describe, expect, it } from "vitest";
import {
  approvedWeekdayLabels,
  buildWeekdayCells,
  weekdayLabel,
  type RecurringDayOff,
} from "./recurringDaysOff";

function req(partial: Partial<RecurringDayOff> & { weekday: number }): RecurringDayOff {
  return {
    requestId: `r${partial.weekday}`,
    status: "pending",
    note: null,
    decisionNote: null,
    ...partial,
  };
}

describe("weekdayLabel", () => {
  it("maps 0 to Monday and 6 to Sunday", () => {
    expect(weekdayLabel(0)).toBe("Monday");
    expect(weekdayLabel(6)).toBe("Sunday");
  });

  it("returns a dash for an out-of-range weekday", () => {
    expect(weekdayLabel(9)).toBe("—");
  });
});

describe("buildWeekdayCells", () => {
  it("returns seven Mon..Sun cells with no request when empty", () => {
    const cells = buildWeekdayCells([]);
    expect(cells).toHaveLength(7);
    expect(cells[0]).toMatchObject({ weekday: 0, shortLabel: "Mon", label: "Monday", request: null });
    expect(cells[6]!.shortLabel).toBe("Sun");
    expect(cells.every((cell) => cell.request === null)).toBe(true);
  });

  it("attaches each request to its weekday cell", () => {
    const sunday = req({ weekday: 6, status: "approved" });
    const cells = buildWeekdayCells([sunday]);
    expect(cells[6]!.request).toBe(sunday);
    expect(cells[0]!.request).toBeNull();
  });
});

describe("approvedWeekdayLabels", () => {
  it("returns only approved weekdays, sorted, as labels", () => {
    const requests = [
      req({ weekday: 6, status: "approved" }),
      req({ weekday: 2, status: "pending" }),
      req({ weekday: 0, status: "approved" }),
    ];
    expect(approvedWeekdayLabels(requests)).toEqual(["Monday", "Sunday"]);
  });
});
