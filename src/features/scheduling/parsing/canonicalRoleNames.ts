import { normaliseRoleKey } from "@/features/rota/lib/scheduling/shiftSignature";

/**
 * One spelling per role, across a whole import.
 *
 * Role identity is normalized — "Bar", "bar" and "BAR" are the same role to
 * every rule in this subsystem — but the display label is stored as written. A
 * paste mixing the three therefore imported three differently-spelled chips for
 * one role, sitting next to whatever the week already called it.
 *
 * This resolves each role key to a single label: the workspace's own spelling
 * when it has one, otherwise the first spelling in the paste. Only the label
 * changes. The normalized key, and so every identity, duplicate and validation
 * decision made from it, is untouched.
 */
export function buildCanonicalRoleResolver(
  knownRoleNames: readonly string[] = [],
): (roleName: string) => string {
  const canonical = new Map<string, string>();

  // The workspace's existing spellings win: an import should look like the rota
  // it is joining, not rename its roles.
  for (const name of knownRoleNames) {
    const key = normaliseRoleKey(name);
    if (key && !canonical.has(key)) canonical.set(key, name.trim());
  }

  return (roleName: string): string => {
    const key = normaliseRoleKey(roleName);
    if (!key) return roleName;
    const existing = canonical.get(key);
    if (existing !== undefined) return existing;
    const first = roleName.trim();
    canonical.set(key, first);
    return first;
  };
}
