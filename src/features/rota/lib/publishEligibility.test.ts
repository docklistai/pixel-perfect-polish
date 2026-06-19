import { describe, expect, it, vi } from "vitest";
import { getRotaPublishEligibility, openPublishIfEligible } from "./publishEligibility";

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

  it.each([
    [{ ...publishableInput, plannedShiftCount: 0 }, "Add at least one shift before publishing."],
    [{ ...publishableInput, readOnly: true }, "This rota is read-only."],
    [{ ...publishableInput, mutationFailed: true }, "Resolve the failed save before publishing."],
    [{ ...publishableInput, published: true, hasUnpublishedChanges: false }, "already published"],
  ])("blocks invalid publishing states", (input, expectedReason) => {
    const result = getRotaPublishEligibility(input);

    expect(result.canPublish).toBe(false);
    expect(result.blockedReason).toContain(expectedReason);
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

  it("keeps the dialog closed and reports the reason when publishing is blocked", () => {
    const open = vi.fn();
    const blocked = vi.fn();
    const eligibility = getRotaPublishEligibility({
      ...publishableInput,
      plannedShiftCount: 0,
    });

    expect(openPublishIfEligible(eligibility, open, blocked)).toBe(false);
    expect(open).not.toHaveBeenCalled();
    expect(blocked).toHaveBeenCalledWith("Add at least one shift before publishing.");
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
