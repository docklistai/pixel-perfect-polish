import { describe, expect, it } from "vitest";
import {
  CANONICAL_LEAVE_TYPES,
  CANONICAL_LEAVE_TYPE_LABELS,
  formatLeaveType,
} from "./leaveVocabulary";

describe("leaveVocabulary", () => {
  it("defines the exact 5 canonical leave types", () => {
    expect(CANONICAL_LEAVE_TYPES).toEqual(["annual_leave", "sick", "personal", "unpaid", "other"]);
  });

  it("maps canonical keys to locked display labels", () => {
    expect(CANONICAL_LEAVE_TYPE_LABELS.annual_leave).toBe("Annual leave");
    expect(CANONICAL_LEAVE_TYPE_LABELS.sick).toBe("Sickness");
    expect(CANONICAL_LEAVE_TYPE_LABELS.personal).toBe("Compassionate leave");
    expect(CANONICAL_LEAVE_TYPE_LABELS.unpaid).toBe("Unpaid leave");
    expect(CANONICAL_LEAVE_TYPE_LABELS.other).toBe("Other");
  });

  it("formats keys and handles fallbacks gracefully", () => {
    expect(formatLeaveType("annual_leave")).toBe("Annual leave");
    expect(formatLeaveType("sick")).toBe("Sickness");
    expect(formatLeaveType("personal")).toBe("Compassionate leave");
    expect(formatLeaveType("unpaid")).toBe("Unpaid leave");
    expect(formatLeaveType("other")).toBe("Other");
    expect(formatLeaveType(null)).toBe("Leave");
    expect(formatLeaveType(undefined)).toBe("Leave");
    expect(formatLeaveType("custom")).toBe("custom");
  });
});
