import { describe, expect, it } from "vitest";
import { latestSnapshotIdsByWeek, type PulseSnapshotRow } from "./timePulseSnapshots";

function snapshot(overrides: Partial<PulseSnapshotRow>): PulseSnapshotRow {
  return {
    id: "snap-1",
    rota_week_id: "week-1",
    version: 1,
    published_at: "2026-08-15T09:00:00.000Z",
    ...overrides,
  };
}

describe("time pulse — operative snapshot selection", () => {
  it("keeps only the newest version of a republished week", () => {
    const live = latestSnapshotIdsByWeek([
      snapshot({ id: "v1", version: 1 }),
      snapshot({ id: "v2", version: 2 }),
      snapshot({ id: "v3", version: 3 }),
    ]);
    expect(live).toEqual(new Set(["v3"]));
  });

  it("keeps one snapshot per week across several weeks and locations", () => {
    const live = latestSnapshotIdsByWeek([
      snapshot({ id: "a1", rota_week_id: "week-a", version: 1 }),
      snapshot({ id: "a2", rota_week_id: "week-a", version: 2 }),
      snapshot({ id: "b1", rota_week_id: "week-b", version: 1 }),
    ]);
    expect(live).toEqual(new Set(["a2", "b1"]));
  });

  it("breaks a version tie by published_at, then deterministically by id", () => {
    const byTime = latestSnapshotIdsByWeek([
      snapshot({ id: "older", version: 2, published_at: "2026-08-15T09:00:00.000Z" }),
      snapshot({ id: "newer", version: 2, published_at: "2026-08-15T10:00:00.000Z" }),
    ]);
    expect(byTime).toEqual(new Set(["newer"]));

    const byId = latestSnapshotIdsByWeek([
      snapshot({ id: "aaa", version: 2, published_at: "2026-08-15T09:00:00.000Z" }),
      snapshot({ id: "zzz", version: 2, published_at: "2026-08-15T09:00:00.000Z" }),
    ]);
    expect(byId).toEqual(new Set(["zzz"]));
  });

  it("returns nothing when the workspace has never published", () => {
    expect(latestSnapshotIdsByWeek([])).toEqual(new Set());
  });
});
