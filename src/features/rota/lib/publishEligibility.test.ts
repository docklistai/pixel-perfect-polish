import { describe, expect, it, vi } from "vitest";
import {
  getPublishState,
  getRotaPublishEligibility,
  openPublishIfEligible,
  publishStateLabel,
} from "./publishEligibility";

const publishableInput = {
  readOnly: false,
  mutationPending: false,
  mutationFailed: false,
  plannedShiftCount: 3,
  weekStatus: "draft" as const,
  published: false,
  hasUnpublishedChanges: true,
};

describe("getRotaPublishEligibility", () => {
  it("allows a writable rota with saved shifts and unpublished work", () => {
    expect(getRotaPublishEligibility(publishableInput)).toMatchObject({ canPublish: true });
  });

  it("allows publishing an empty week with zero shifts", () => {
    const result = getRotaPublishEligibility({ ...publishableInput, plannedShiftCount: 0 });
    expect(result.canPublish).toBe(true);
    expect(result.blockedReason).toBeNull();
  });

  it.each([
    [{ ...publishableInput, readOnly: true }, "This rota is read-only."],
    [
      { ...publishableInput, mutationPending: true },
      "Wait for the current rota save before publishing.",
    ],
    [{ ...publishableInput, mutationFailed: true }, "Resolve the failed save before publishing."],
    [{ ...publishableInput, published: true, hasUnpublishedChanges: false }, "already published"],
    [
      { ...publishableInput, weekStatus: "archived" as const },
      "Archived rota weeks cannot be published.",
    ],
  ])("blocks invalid publishing states", (input, expectedReason) => {
    const result = getRotaPublishEligibility(input);

    expect(result.canPublish).toBe(false);
    expect(result.blockedReason).toContain(expectedReason);
  });

  it("leaves publish eligible when a preview operation fails (mutationFailed is false)", () => {
    const result = getRotaPublishEligibility({
      ...publishableInput,
      mutationFailed: false,
    });
    expect(result.canPublish).toBe(true);
  });
});

describe("getPublishState", () => {
  it("returns empty-week for zero shifts, never ready", () => {
    expect(getPublishState({ plannedShiftCount: 0, hasReadinessIssues: false })).toBe("empty-week");
    expect(getPublishState({ plannedShiftCount: 0, hasReadinessIssues: true })).toBe("empty-week");
    expect(publishStateLabel("empty-week")).toBe("Empty week");
  });

  it("returns review when shifts are planned but readiness issues exist", () => {
    expect(getPublishState({ plannedShiftCount: 5, hasReadinessIssues: true })).toBe("review");
    expect(publishStateLabel("review")).toBe("Review before publishing");
  });

  it("returns ready when shifts are planned and no readiness issues exist", () => {
    expect(getPublishState({ plannedShiftCount: 5, hasReadinessIssues: false })).toBe("ready");
    expect(publishStateLabel("ready")).toBe("Ready to publish");
  });

  it("returns published when week is published with no unpublished changes", () => {
    expect(
      getPublishState({
        plannedShiftCount: 5,
        published: true,
        hasUnpublishedChanges: false,
      }),
    ).toBe("published");
  });

  it("returns empty-week when week has unpublished changes but 0 shifts", () => {
    expect(
      getPublishState({
        plannedShiftCount: 0,
        published: true,
        hasUnpublishedChanges: true,
      }),
    ).toBe("empty-week");
  });
});

describe("openPublishIfEligible", () => {
  it("opens intent-driven publishing only when the authoritative state allows it", () => {
    const open = vi.fn();
    const blocked = vi.fn();

    expect(openPublishIfEligible(getRotaPublishEligibility(publishableInput), open, blocked)).toBe(
      true,
    );
    expect(open).toHaveBeenCalledOnce();
    expect(blocked).not.toHaveBeenCalled();
  });

  it("opens intent-driven publishing for empty weeks", () => {
    const open = vi.fn();
    const blocked = vi.fn();
    const eligibility = getRotaPublishEligibility({
      ...publishableInput,
      plannedShiftCount: 0,
    });

    expect(openPublishIfEligible(eligibility, open, blocked)).toBe(true);
    expect(open).toHaveBeenCalledOnce();
    expect(blocked).not.toHaveBeenCalled();
  });

  it("keeps the dialog closed and reports the reason when publishing is blocked", () => {
    const open = vi.fn();
    const blocked = vi.fn();
    const eligibility = getRotaPublishEligibility({
      ...publishableInput,
      readOnly: true,
    });

    expect(openPublishIfEligible(eligibility, open, blocked)).toBe(false);
    expect(open).not.toHaveBeenCalled();
    expect(blocked).toHaveBeenCalledWith("This rota is read-only.");
  });

  it("blocks confirmation if eligibility changes before the user confirms", () => {
    const open = vi.fn();
    const blocked = vi.fn();
    const eligibility = getRotaPublishEligibility({
      ...publishableInput,
      readOnly: true,
    });

    expect(eligibility.canPublish).toBe(false);
    expect(openPublishIfEligible(eligibility, open, blocked)).toBe(false);
    expect(open).not.toHaveBeenCalled();
    expect(blocked).toHaveBeenCalledWith("This rota is read-only.");
  });
});
