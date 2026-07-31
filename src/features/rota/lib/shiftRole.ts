/**
 * One rule for manual role entry, shared by the inline editor, the Add and Edit
 * drawers and split-shift entry.
 *
 * The staff member's profile role is a default and a suitability signal — it is
 * not a restriction. A manager covering a gap may schedule someone as anything,
 * including a temporary label like Training or Cover that is not a configured
 * workspace role. That is normal hospitality work, so it is surfaced as a calm
 * note, never an error, and it never blocks saving.
 *
 * What it must never do: create a permanent workspace role, or change the staff
 * member's own profile role. A temporary role lives on the one shift.
 */

import { normaliseRoleKey } from "./scheduling/shiftSignature";

/** Free-text roles are labels on a shift, so keep them short and clean. */
export const MAX_SHIFT_ROLE_LENGTH = 120;

export type ShiftRoleKind = "configured" | "temporary";

export type ShiftRoleResolution = {
  /** The role to store on the shift, already sanitised. */
  role: string;
  kind: ShiftRoleKind;
  /** Calm explanation, or null when the role matches the staff profile. */
  warning: string | null;
};

/**
 * Loose token form: punctuation collapsed to spaces.
 *
 * Used only by the ambiguity-guarded second matching stage below. It is **not**
 * role identity — it treats "Bar/Kitchen" and "Bar Kitchen" as the same token,
 * which is exactly why any match it produces must be unique before it is trusted.
 * Demand signatures and eligibility use `normaliseRoleKey` from
 * `scheduling/shiftSignature`, which preserves punctuation.
 */
export function normaliseRoleToken(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Control characters, stripped before a role is stored or displayed. */
// eslint-disable-next-line no-control-regex
const CONTROL_CHARACTERS = new RegExp("[\\u0000-\\u001f\\u007f]", "g");

/**
 * Trims, collapses whitespace, strips control characters and caps the length.
 * Sanitisation is kept here so every entry point enforces the same limits.
 */
export function sanitiseShiftRole(value: string): string {
  return value
    .replace(CONTROL_CHARACTERS, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_SHIFT_ROLE_LENGTH);
}

/**
 * Tidies a free-text label so "training" reads as "Training" on the grid.
 *
 * Only all-lowercase input is title-cased. Anything the manager capitalised
 * themselves is left exactly as typed, so acronyms like FOH or an intentional
 * "TRAINING" are never mangled.
 */
function toLabel(value: string): string {
  if (value !== value.toLowerCase()) return value;
  return value
    .split(" ")
    .map((word) => (word ? word[0]!.toUpperCase() + word.slice(1) : word))
    .join(" ");
}

/**
 * Matches typed text against the configured roles. Anything unmatched becomes a
 * temporary label rather than an error.
 *
 * **Substring matching is gone.** It silently rewrote a manager's role: with
 * "Barista" configured, typing "Bar" produced a Barista shift, and the person
 * whose role actually was "Bar" could then never be suggested for it. Which role
 * won also depended on the order the configured list happened to arrive in.
 *
 * Matching now runs in two stages, and neither can ever match a shorter role to a
 * longer one:
 *
 * 1. exact on `normaliseRoleKey` — case and spacing only, the same identity the
 *    scheduling planner uses, so typing a role and being eligible for it agree;
 * 2. separator-tolerant, so "kitchen-porter" still finds "Kitchen Porter" — but
 *    **only when exactly one** configured role matches. Two roles that differ
 *    only in punctuation ("Bar/Kitchen" and "Bar Kitchen") are genuinely
 *    ambiguous, so nothing is guessed and the text becomes a temporary label.
 *
 * Stage 2 matters for correctness, not just convenience: without it a manager
 * typing a real role with a hyphen would mint a temporary role no staff member
 * holds, which exact eligibility could then never staff — the same failure the
 * removed "FOH" fallback used to cause.
 */
/**
 * The single configured role whose words match ignoring separators, or undefined
 * when none or more than one does. Never matches a shorter role to a longer one:
 * the whole token has to be equal, only the punctuation between words is ignored.
 */
function findUnambiguousBySeparator(
  cleaned: string,
  configuredRoles: readonly string[],
): string | undefined {
  const token = normaliseRoleToken(cleaned);
  if (!token) return undefined;
  const matches = configuredRoles.filter((role) => normaliseRoleToken(role) === token);
  return matches.length === 1 ? matches[0] : undefined;
}

export function resolveShiftRole({
  input,
  configuredRoles = [],
  profileRole,
}: {
  input: string;
  configuredRoles?: readonly string[];
  profileRole?: string | null;
}): ShiftRoleResolution | null {
  const cleaned = sanitiseShiftRole(input);
  if (!cleaned) return null;

  const key = normaliseRoleKey(cleaned);
  if (!key) return null;

  const exact = configuredRoles.find((role) => normaliseRoleKey(role) === key);
  const configured = exact ?? findUnambiguousBySeparator(cleaned, configuredRoles);

  if (configured) {
    const differsFromProfile =
      Boolean(profileRole) && normaliseRoleKey(profileRole!) !== normaliseRoleKey(configured);
    return {
      role: configured,
      kind: "configured",
      warning: differsFromProfile
        ? `Usual role: ${profileRole} · Scheduled as ${configured}`
        : null,
    };
  }

  return {
    role: toLabel(cleaned),
    kind: "temporary",
    warning: "Temporary shift role — this will not be added to workspace roles",
  };
}
