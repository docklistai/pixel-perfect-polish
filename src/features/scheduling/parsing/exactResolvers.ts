/**
 * Exact resolution of typed text to a real staff member, role or department.
 *
 * Every resolver returns one of three outcomes and never a best guess:
 *
 * - `resolved`   — exactly one candidate matched;
 * - `unresolved` — nothing matched;
 * - `ambiguous`  — more than one matched, so choosing would be a guess.
 *
 * `ambiguous` is the outcome that matters. Two staff members genuinely can share
 * a name, and an importer that quietly takes the first one assigns a real shift
 * to the wrong person — a mistake nobody notices until someone does not turn up.
 */

export type ResolutionOutcome<T> =
  | { kind: "resolved"; value: T }
  | { kind: "unresolved" }
  | { kind: "ambiguous"; candidates: T[] };

/** Case- and spacing-insensitive; nothing else is normalised away. */
export function normaliseLookupKey(value: string): string {
  return value
    .replace(/[ \t\r\n\f\v]+/g, " ")
    .replace(/^ +| +$/g, "")
    .toLowerCase();
}

export function resolveExact<T>(
  input: string,
  candidates: readonly T[],
  keyOf: (candidate: T) => string,
): ResolutionOutcome<T> {
  const key = normaliseLookupKey(input);
  if (!key) return { kind: "unresolved" };
  const matches = candidates.filter((candidate) => normaliseLookupKey(keyOf(candidate)) === key);
  if (matches.length === 0) return { kind: "unresolved" };
  if (matches.length > 1) return { kind: "ambiguous", candidates: matches };
  return { kind: "resolved", value: matches[0]! };
}

export type StaffCandidate = { id: string; name: string; active: boolean };
export type DepartmentCandidate = { id: string; name: string; active: boolean };

/**
 * Inactive staff are excluded before matching rather than after, so an import
 * naming a leaver reports "not found" instead of resolving to someone who can no
 * longer be scheduled.
 */
export function resolveStaffByName(
  input: string,
  staff: readonly StaffCandidate[],
): ResolutionOutcome<StaffCandidate> {
  return resolveExact(
    input,
    staff.filter((member) => member.active),
    (member) => member.name,
  );
}

export function resolveDepartmentByName(
  input: string,
  departments: readonly DepartmentCandidate[],
): ResolutionOutcome<DepartmentCandidate> {
  return resolveExact(
    input,
    departments.filter((department) => department.active),
    (department) => department.name,
  );
}

/**
 * Roles resolve against the roles staff actually hold.
 *
 * A role nobody holds is not an error — a manager may legitimately schedule
 * Training or Cover — but it is reported so the caller can say the shift will be
 * unstaffable by automatic assignment, which requires exact role equality.
 */
export function resolveRoleName(
  input: string,
  knownRoles: readonly string[],
): ResolutionOutcome<string> {
  return resolveExact(input, knownRoles, (role) => role);
}

/** Message for an unresolved or ambiguous outcome, ready to show a manager. */
export function describeResolution(
  outcome: ResolutionOutcome<unknown>,
  what: string,
  input: string,
): string | null {
  if (outcome.kind === "resolved") return null;
  if (outcome.kind === "unresolved") {
    return `No ${what} called "${input.trim()}" was found.`;
  }
  return (
    `More than one ${what} is called "${input.trim()}", so this row was not applied. ` +
    "Rename one of them, or import by a unique name."
  );
}
