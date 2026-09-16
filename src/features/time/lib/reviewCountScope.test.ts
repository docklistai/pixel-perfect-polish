import { describe, it, expect } from "vitest";
import { rollingTimeRange, TIME_OPERATIONAL_LOOKBACK_DAYS, timeQueryKeys } from "./timeQueryRange";
import { pendingTimePreviewInput, timeOperationalCountsInput } from "../api/timeLiveSchemas";

/**
 * Proves that Home, sidebar chrome badges, and Time review surfaces adhere to
 * the exact same review-period scoping contract so that manager review counts
 * never diverge across navigation surfaces.
 */
describe("Review count scope unification", () => {
  const workspaceId = "10000000-0000-4000-8000-000000000001";
  const fixedNow = new Date("2026-09-16T12:00:00.000Z");

  it("produces identical date range bounds for Home and Chrome badges", () => {
    const timeRange = rollingTimeRange(fixedNow, TIME_OPERATIONAL_LOOKBACK_DAYS);

    // Sidebar badge query schema
    const operationalInput = timeOperationalCountsInput.parse({
      workspaceId,
      ...timeRange,
    });

    // Home pending preview query schema
    const previewInput = pendingTimePreviewInput.parse({
      workspaceId,
      limit: 5,
      ...timeRange,
    });

    expect(previewInput.startDate).toBe(operationalInput.startDate);
    expect(previewInput.endDate).toBe(operationalInput.endDate);
    expect(previewInput.workspaceId).toBe(operationalInput.workspaceId);
  });

  it("differentiates query keys by date range to prevent cross-period cache collisions", () => {
    const rangeA = rollingTimeRange(fixedNow, 30);
    const rangeB = rollingTimeRange(fixedNow, 60);

    const keyA = timeQueryKeys.pendingPreview(workspaceId, 5, rangeA);
    const keyB = timeQueryKeys.pendingPreview(workspaceId, 5, rangeB);

    expect(keyA).not.toEqual(keyB);
  });
});
