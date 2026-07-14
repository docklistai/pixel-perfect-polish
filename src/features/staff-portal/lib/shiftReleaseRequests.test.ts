import { describe, expect, it } from "vitest";
import {
  canRequestShiftRelease,
  shiftReleaseStatusPresentation,
  type ShiftReleaseStatus,
} from "./shiftReleaseRequests";

describe("shift release request presentation", () => {
  it.each<[ShiftReleaseStatus, string]>([
    ["pending", "Pending"],
    ["approved", "Approved — awaiting rota update"],
    ["declined", "Declined"],
    ["withdrawn", "Withdrawn"],
    ["completed", "Completed"],
    ["stale", "Rota changed"],
  ])("gives %s an honest status label", (status, label) => {
    expect(shiftReleaseStatusPresentation(status).label).toBe(label);
  });

  it("keeps responsibility copy visible until republish", () => {
    expect(shiftReleaseStatusPresentation("pending").responsibilityContinues).toBe(true);
    expect(shiftReleaseStatusPresentation("approved").responsibilityContinues).toBe(true);
    expect(shiftReleaseStatusPresentation("completed").responsibilityContinues).toBe(false);
  });

  it("allows a fresh request or a re-request only after withdrawal", () => {
    expect(canRequestShiftRelease(null)).toBe(true);
    expect(canRequestShiftRelease("withdrawn")).toBe(true);
    expect(canRequestShiftRelease("pending")).toBe(false);
    expect(canRequestShiftRelease("declined")).toBe(false);
  });
});
