/**
 * Builds the workspace/location line under the printed title.
 *
 * Many workspaces name their only location after the business itself, which
 * would otherwise print as "Harbour View Hotel · Harbour View Hotel". When the
 * two name the same place — ignoring case and surrounding whitespace — it is
 * printed once. Genuinely different names keep the existing separator.
 */
export function buildPrintIdentityLine(workspaceName: string, locationName: string): string {
  const key = (value: string) => value.trim().toLowerCase();
  if (key(workspaceName) === key(locationName)) return workspaceName;
  return `${workspaceName} · ${locationName}`;
}

/**
 * Display names for the printed rota.
 *
 * Duplicate names get the smallest disambiguator that is already public on the
 * printed page: their role. If that still collides, a plain occurrence number is
 * appended. Nothing private (email, id, phone, pay) is ever used to tell two
 * people apart — a rota goes on a staff-room wall.
 */
export function disambiguateStaffNames(rows: { name: string; role: string }[]): string[] {
  const nameCounts = new Map<string, number>();
  for (const row of rows) nameCounts.set(row.name, (nameCounts.get(row.name) ?? 0) + 1);

  const roleKeyCounts = new Map<string, number>();
  for (const row of rows) {
    const key = `${row.name}||${row.role}`;
    roleKeyCounts.set(key, (roleKeyCounts.get(key) ?? 0) + 1);
  }

  const seen = new Map<string, number>();
  return rows.map((row) => {
    if ((nameCounts.get(row.name) ?? 0) <= 1) return row.name;

    const roleKey = `${row.name}||${row.role}`;
    if (row.role && (roleKeyCounts.get(roleKey) ?? 0) === 1) return `${row.name} (${row.role})`;

    const occurrence = (seen.get(roleKey) ?? 0) + 1;
    seen.set(roleKey, occurrence);
    return row.role ? `${row.name} (${row.role} ${occurrence})` : `${row.name} (${occurrence})`;
  });
}
