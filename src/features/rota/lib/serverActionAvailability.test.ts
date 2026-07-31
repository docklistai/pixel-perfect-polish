import { describe, expect, it } from "vitest";
import {
  BUILD_WEEK_OFFLINE_REASON,
  buildWeekAvailability,
  IMPORT_SCHEDULE_OFFLINE_REASON,
  importScheduleAvailability,
  NOT_EDITABLE_REASON,
} from "./serverActionAvailability";

/**
 * The gate both server-backed rota flows ask before offering a write.
 *
 * Build the Week and Import a schedule are the two places in the rota that call
 * server functions from a drawer. Neither can run on the offline sample rota, so
 * what matters here is not only that they refuse, but that the refusal names the
 * real reason — an earlier version told an offline manager the week might still
 * be loading, which was never true and could not become true.
 */

const LIVE_EDITABLE = { serverBacked: true, canEdit: true };
const LIVE_NOT_EDITABLE = { serverBacked: true, canEdit: false };
const OFFLINE = { serverBacked: false, canEdit: false };

describe("the offline sample rota", () => {
  it("refuses Build and Import, and says why in each flow's own words", () => {
    expect(buildWeekAvailability(OFFLINE)).toEqual({
      available: false,
      reason: BUILD_WEEK_OFFLINE_REASON,
    });
    expect(importScheduleAvailability(OFFLINE)).toEqual({
      available: false,
      reason: IMPORT_SCHEDULE_OFFLINE_REASON,
    });
  });

  it("never blames loading or publishing for something a workspace would fix", () => {
    for (const reason of [BUILD_WEEK_OFFLINE_REASON, IMPORT_SCHEDULE_OFFLINE_REASON]) {
      expect(reason).not.toMatch(/loading|published|publishing/i);
      expect(reason).toMatch(/offline sample rota/);
      expect(reason).toMatch(/nothing would be saved/i);
    }
  });

  it("is checked before editability, so the wrong reason cannot win", () => {
    // A demo rota reports canEdit false as well; the offline reason is the true one.
    expect(importScheduleAvailability({ serverBacked: false, canEdit: true })).toEqual({
      available: false,
      reason: IMPORT_SCHEDULE_OFFLINE_REASON,
    });
  });
});

describe("a workspace-backed rota", () => {
  it("allows Build and Import once the week is editable", () => {
    expect(buildWeekAvailability(LIVE_EDITABLE)).toEqual({ available: true });
    expect(importScheduleAvailability(LIVE_EDITABLE)).toEqual({ available: true });
  });

  it("refuses both while the week is loading or already published, and says so", () => {
    expect(buildWeekAvailability(LIVE_NOT_EDITABLE)).toEqual({
      available: false,
      reason: NOT_EDITABLE_REASON,
    });
    expect(importScheduleAvailability(LIVE_NOT_EDITABLE)).toEqual({
      available: false,
      reason: NOT_EDITABLE_REASON,
    });
  });
});
