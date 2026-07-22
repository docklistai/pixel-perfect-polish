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
 * Matches typed text against the configured roles, tolerating case and
 * punctuation. Anything unmatched becomes a temporary label rather than an
 * error.
 */
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

  const key = normaliseRoleToken(cleaned);
  if (!key) return null;

  const configured =
    configuredRoles.find((role) => normaliseRoleToken(role) === key) ??
    configuredRoles.find((role) => {
      const roleKey = normaliseRoleToken(role);
      return roleKey.length > 2 && (key.includes(roleKey) || roleKey.includes(key));
    });

  if (configured) {
    const differsFromProfile =
      Boolean(profileRole) && normaliseRoleToken(profileRole!) !== normaliseRoleToken(configured);
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
