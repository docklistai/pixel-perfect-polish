export interface PublishedVenueEntry {
  shift_id: string | null;
  scheduled_start_at: string | null;
  scheduled_end_at: string | null;
}

export interface PublishedVenueRow {
  source_shift_id: string;
  location_id: string;
  starts_at: string;
  ends_at: string;
  snapshot_id: string;
}

export interface PublishedSnapshotOrder {
  id: string;
  version: number;
  published_at: string;
}

function sameInstant(left: string | null, right: string): boolean {
  return left !== null && Date.parse(left) === Date.parse(right);
}

/** Select the latest immutable published venue matching the stored schedule instants. */
export function selectPublishedVenueLocationIds(
  entries: PublishedVenueEntry[],
  rows: PublishedVenueRow[],
  snapshots: PublishedSnapshotOrder[],
): Map<string, string> {
  const entriesByShift = new Map(
    entries.flatMap((entry) => (entry.shift_id ? [[entry.shift_id, entry] as const] : [])),
  );
  const snapshotById = new Map(snapshots.map((snapshot) => [snapshot.id, snapshot]));
  const selected = new Map<
    string,
    { locationId: string; version: number; publishedAt: string; snapshotId: string }
  >();

  for (const row of rows) {
    const entry = entriesByShift.get(row.source_shift_id);
    const snapshot = snapshotById.get(row.snapshot_id);
    if (
      !entry ||
      !snapshot ||
      !sameInstant(entry.scheduled_start_at, row.starts_at) ||
      !sameInstant(entry.scheduled_end_at, row.ends_at)
    ) {
      continue;
    }
    const current = selected.get(row.source_shift_id);
    const newer =
      !current ||
      snapshot.version > current.version ||
      (snapshot.version === current.version && snapshot.published_at > current.publishedAt) ||
      (snapshot.version === current.version &&
        snapshot.published_at === current.publishedAt &&
        snapshot.id > current.snapshotId);
    if (newer) {
      selected.set(row.source_shift_id, {
        locationId: row.location_id,
        version: snapshot.version,
        publishedAt: snapshot.published_at,
        snapshotId: snapshot.id,
      });
    }
  }
  return new Map([...selected].map(([shiftId, value]) => [shiftId, value.locationId]));
}
