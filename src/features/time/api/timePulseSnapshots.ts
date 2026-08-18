export interface PulseShiftRow {
  source_shift_id: string;
  snapshot_id: string;
  staff_member_id: string | null;
  location_id: string;
  starts_at: string;
  ends_at: string;
  role_name: string;
  assignment_status: "scheduled" | "open";
}

export interface PulseSnapshotRow {
  id: string;
  rota_week_id: string;
  version: number;
  published_at: string;
}

/**
 * The operative snapshot id for each rota week.
 *
 * A rota week accumulates a snapshot per publication, and every one of them
 * keeps its rows in `published_rota_shifts`. Reading them all would show a
 * shift twice, or show a shift that a later republish removed, so the board
 * must keep only the newest snapshot per week. Ordering matches the existing
 * published-venue selection: version, then published_at, then id as a stable
 * final tiebreak.
 */
export function latestSnapshotIdsByWeek(snapshots: PulseSnapshotRow[]): Set<string> {
  const winners = new Map<string, PulseSnapshotRow>();
  for (const snapshot of snapshots) {
    const current = winners.get(snapshot.rota_week_id);
    const newer =
      !current ||
      snapshot.version > current.version ||
      (snapshot.version === current.version && snapshot.published_at > current.published_at) ||
      (snapshot.version === current.version &&
        snapshot.published_at === current.published_at &&
        snapshot.id > current.id);
    if (newer) winners.set(snapshot.rota_week_id, snapshot);
  }
  return new Set([...winners.values()].map((snapshot) => snapshot.id));
}
