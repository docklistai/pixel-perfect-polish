import { describe, expect, it } from "vitest";
import { shortLeaveLabel } from "./leaveGridLabel";

describe("shortLeaveLabel", () => {
  it("maps enum leave types to short badges", () => {
    expect(shortLeaveLabel("annual_leave")).toBe("Holiday");
    expect(shortLeaveLabel("sick")).toBe("Sick");
    expect(shortLeaveLabel("unpaid")).toBe("Unpaid");
    expect(shortLeaveLabel("personal")).toBe("Personal");
  });

  it("maps human display labels too, case-insensitively", () => {
    expect(shortLeaveLabel("Annual leave")).toBe("Holiday");
    expect(shortLeaveLabel("Sick leave")).toBe("Sick");
    expect(shortLeaveLabel("Compassionate leave")).toBe("Personal");
  });

  it("falls back to a generic Leave badge for unknown types", () => {
    expect(shortLeaveLabel("other")).toBe("Leave");
    expect(shortLeaveLabel("sabbatical")).toBe("Leave");
  });
});
