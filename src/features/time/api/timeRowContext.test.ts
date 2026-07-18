import { describe, expect, it } from "vitest";
import { selectPublishedVenueLocationIds } from "./publishedVenueSelection";

describe("selectPublishedVenueLocationIds", () => {
  it("uses the latest immutable row matching the stored schedule", () => {
    const selected = selectPublishedVenueLocationIds(
      [
        {
          shift_id: "shift",
          scheduled_start_at: "2026-07-14T08:00:00Z",
          scheduled_end_at: "2026-07-14T16:00:00Z",
        },
      ],
      [
        {
          source_shift_id: "shift",
          location_id: "old-venue",
          starts_at: "2026-07-14T08:00:00Z",
          ends_at: "2026-07-14T16:00:00Z",
          snapshot_id: "snapshot-1",
        },
        {
          source_shift_id: "shift",
          location_id: "published-venue",
          starts_at: "2026-07-14T08:00:00Z",
          ends_at: "2026-07-14T16:00:00Z",
          snapshot_id: "snapshot-2",
        },
        {
          source_shift_id: "shift",
          location_id: "moved-draft-shape",
          starts_at: "2026-07-14T09:00:00Z",
          ends_at: "2026-07-14T17:00:00Z",
          snapshot_id: "snapshot-3",
        },
      ],
      [
        { id: "snapshot-1", version: 1, published_at: "2026-07-01T09:00:00Z" },
        { id: "snapshot-2", version: 2, published_at: "2026-07-08T09:00:00Z" },
        { id: "snapshot-3", version: 3, published_at: "2026-07-10T09:00:00Z" },
      ],
    );
    expect(selected.get("shift")).toBe("published-venue");
  });

  it("returns no authority when published instants do not match stored linkage", () => {
    const selected = selectPublishedVenueLocationIds(
      [
        {
          shift_id: "shift",
          scheduled_start_at: "2026-07-14T08:00:00Z",
          scheduled_end_at: "2026-07-14T16:00:00Z",
        },
      ],
      [
        {
          source_shift_id: "shift",
          location_id: "other",
          starts_at: "2026-07-14T09:00:00Z",
          ends_at: "2026-07-14T17:00:00Z",
          snapshot_id: "snapshot",
        },
      ],
      [{ id: "snapshot", version: 1, published_at: "2026-07-01T09:00:00Z" }],
    );
    expect(selected.has("shift")).toBe(false);
  });
});
