import { describe, expect, it, vi } from "vitest";
import {
  buildCopyPreviousWeekConfirmation,
  requestLiveCopyPreviousWeekConfirmation,
} from "./copyPreviousWeekAction";
import type { LiveCopyPreviousWeekPreview } from "../api/copyPreviousLiveRotaWeek";

const preview: LiveCopyPreviousWeekPreview = {
  previousWeekStart: "2026-06-22",
  previousWeekLabel: "22-28 Jun",
  targetWeekStart: "2026-06-29",
  targetWeekLabel: "29 Jun - 5 Jul",
  sourceShiftCount: 5,
  currentShiftCount: 2,
  assignedShiftCount: 4,
  openShiftCount: 1,
};

describe("buildCopyPreviousWeekConfirmation", () => {
  it("clearly describes what live copy will replace and copy", () => {
    const confirmation = buildCopyPreviousWeekConfirmation(preview);

    expect(confirmation.title).toBe("Copy last week into this draft?");
    expect(confirmation.confirmLabel).toBe("Copy into draft");
    expect(confirmation.description).toContain("5 shifts will be copied from 22-28 Jun");
    expect(confirmation.description).toContain("replace 2 current draft shifts");
    expect(confirmation.description).toContain("This does not publish the rota");
  });
});

describe("requestLiveCopyPreviousWeekConfirmation", () => {
  it("requests manager confirmation without applying the live copy action", async () => {
    const previewCopyPreviousWeek = vi.fn().mockResolvedValue(preview);
    const requestCopyPreviousWeek = vi.fn();
    const copyPreviousWeek = vi.fn();

    await expect(
      requestLiveCopyPreviousWeekConfirmation({
        previewCopyPreviousWeek,
        requestCopyPreviousWeek,
      }),
    ).resolves.toBe(preview);

    expect(previewCopyPreviousWeek).toHaveBeenCalledTimes(1);
    expect(requestCopyPreviousWeek).toHaveBeenCalledWith(preview);
    expect(copyPreviousWeek).not.toHaveBeenCalled();
  });
});
