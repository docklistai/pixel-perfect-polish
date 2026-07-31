import { isOvernightLocal } from "./calendarInterval";

/**
 * The normalized identity of a required shift — the unit demand is reconciled by.
 *
 * Demand is a multiset: two identical required shifts are two rows, not one, and
 * reconciliation compares counts per signature rather than matching rows to each
 * other. That is what lets a venue legitimately need three identical Saturday
 * closes without a rebuild treating two of them as duplicates to remove.
 *
 * Presentation is deliberately absent. `colour_override` and `dept_override` are
 * manager formatting, not demand: two shifts differing only in chip colour are
 * the same requirement. They are carried forward onto a shift this planner
 * creates, and never rewritten on a shift that already exists.
 */
export type ShiftSignature = {
  /** Local date the shift is filed under, `yyyy-mm-dd`. */
  workDate: string;
  /** Local start, `HH:MM`. */
  startLocal: string;
  /** Local end, `HH:MM`. */
  endLocal: string;
  /** Explicit — derived once here, never re-inferred by comparing the strings. */
  overnight: boolean;
  /** Normalized role identity. Exact match only; see {@link normaliseRoleKey}. */
  roleKey: string;
  departmentId: string;
  locationId: string;
  breakMinutes: number;
};

/**
 * Collapses whitespace, trims, lowercases. Nothing else.
 *
 * Punctuation is significant: "Bar" and "Bar/Kitchen" are different roles, and a
 * previous implementation's substring matching silently turned a manager's "Bar"
 * into a configured "Barista". Exact normalized equality is the only role test in
 * this subsystem.
 *
 * The character class is written out rather than using `\s` so this is provably
 * identical to the SQL side (`rpc_internal_normalise_role_key`). Postgres `\s`
 * means the six ASCII space characters, while JavaScript `\s` also matches
 * Unicode spaces such as U+00A0 — a role containing a non-breaking space would
 * otherwise normalize one way in the planner and another in the database. For the
 * same reason whitespace is collapsed *before* trimming, because Postgres
 * `btrim(text)` with no second argument trims spaces only, not tabs or newlines.
 */
const ASCII_WHITESPACE_RUN = /[ \t\r\n\f\v]+/g;

export function normaliseRoleKey(role: string): string {
  return role
    .replace(ASCII_WHITESPACE_RUN, " ")
    .replace(/^ +| +$/g, "")
    .toLowerCase();
}

export type ShiftSignatureInput = {
  workDate: string;
  start: string;
  end: string;
  role: string;
  departmentId: string;
  locationId: string;
  breakMinutes: number;
};

export function buildShiftSignature(input: ShiftSignatureInput): ShiftSignature {
  return {
    workDate: input.workDate,
    startLocal: input.start,
    endLocal: input.end,
    overnight: isOvernightLocal(input.start, input.end),
    roleKey: normaliseRoleKey(input.role),
    departmentId: input.departmentId,
    locationId: input.locationId,
    breakMinutes: input.breakMinutes,
  };
}

/**
 * The bucket key for counting demand.
 *
 * `roleKey` is placed last on purpose. It is the only variable-length component
 * and the only one that can contain the separator ("head chef"), so putting it at
 * the end keeps the key unambiguous: every field before it has a fixed shape
 * (ISO date, `HH:MM`, a single digit, two UUIDs, an integer), and everything after
 * the final separator is the role. A plain space is used rather than a control
 * character so the same key can be reproduced in SQL, where `text` cannot hold a
 * NUL byte at all.
 */
const KEY_SEPARATOR = " ";

export function signatureKey(signature: ShiftSignature): string {
  return [
    signature.workDate,
    signature.startLocal,
    signature.endLocal,
    signature.overnight ? "1" : "0",
    signature.departmentId,
    signature.locationId,
    String(signature.breakMinutes),
    signature.roleKey,
  ].join(KEY_SEPARATOR);
}

/**
 * Total order over signatures, so a proposal's operations are always emitted in
 * the same sequence for the same inputs. Two signatures compare equal exactly
 * when their keys match, so no two distinct signatures ever tie.
 */
export function compareSignatures(left: ShiftSignature, right: ShiftSignature): number {
  const leftKey = signatureKey(left);
  const rightKey = signatureKey(right);
  if (leftKey === rightKey) return 0;
  return leftKey < rightKey ? -1 : 1;
}

/** Counts required or existing shifts into signature buckets. */
export function countBySignature<T>(
  items: readonly T[],
  signatureOf: (item: T) => ShiftSignature,
): Map<string, { signature: ShiftSignature; count: number }> {
  const buckets = new Map<string, { signature: ShiftSignature; count: number }>();
  for (const item of items) {
    const signature = signatureOf(item);
    const key = signatureKey(signature);
    const existing = buckets.get(key);
    if (existing) existing.count += 1;
    else buckets.set(key, { signature, count: 1 });
  }
  return buckets;
}
