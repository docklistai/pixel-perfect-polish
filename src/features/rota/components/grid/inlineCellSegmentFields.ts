import { RANGE_PATTERN, TIME_PATTERN } from "../../lib/scheduling/shiftTimeVocabulary";
import { resolveShiftRole } from "../../lib/shiftRole";

/**
 * The non-time fields of one inline cell segment: the break, and the role.
 *
 * Both are read from whatever text is left once the time range has been taken
 * out, which makes them the place a mistyped cell is finally caught. The rule
 * they enforce together: **leftover text is either a role or a mistake, never
 * silently a role that is obviously a mistake.**
 */

export const TIME_HELP = "Use times like 9-5, 22:00-02:00, open 6pm-11pm bar, or 9-12 / 17-22.";

/** "break 30", "30m break", "30 min break", "30 minutes break", "no break". */
const BREAK_PREFIX = /\b(?:break|brk)\s*(\d{1,3})\s*(?:m|mins?|minutes?)?\b/i;
const BREAK_SUFFIX = /\b(\d{1,3})\s*(?:m|mins?|minutes?)?\s*(?:break|brk)\b/i;

export function extractBreakMinutes(input: string): { text: string; breakMinutes: number | null } {
  if (/\bno\s+break\b/i.test(input)) {
    return { text: input.replace(/\bno\s+break\b/gi, " "), breakMinutes: 0 };
  }
  const match = input.match(BREAK_PREFIX) ?? input.match(BREAK_SUFFIX);
  if (!match) return { text: input, breakMinutes: null };
  const minutes = Number(match[1]);
  if (!Number.isInteger(minutes) || minutes < 0 || minutes > 240) {
    return { text: input, breakMinutes: null };
  }
  return { text: input.replace(match[0], " "), breakMinutes: minutes };
}

/** Only digits and the characters times are written with — never a role label. */
const ONLY_TIME_CHARACTERS = /^[\d\s:.\-–—]+$/;
const SINGLE_TIME_TOKEN = new RegExp(String.raw`^(?:${TIME_PATTERN})$`, "i");

/**
 * Whether the leftover is unconsumed time input rather than a role.
 *
 * One range is read per segment, so a cell holding "9-5 9-5" leaves a whole
 * second range behind. Accepting it as free text would file a shift under a role
 * literally named "9-5" — the manager meant two shifts and got one mislabelled
 * one, with nothing said.
 */
export function looksLikeLeftoverTime(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  return (
    RANGE_PATTERN.test(trimmed) ||
    ONLY_TIME_CHARACTERS.test(trimmed) ||
    SINGLE_TIME_TOKEN.test(trimmed)
  );
}

export type RoleResolution =
  | { ok: true; role: string | null; warning: string | null }
  | { ok: false; message: string };

export type RoleResolutionOptions = {
  roleOptions?: string[];
  profileRole?: string | null;
};

/**
 * Resolves the leftover text into a role for this shift.
 *
 * Unknown text is accepted as a temporary shift label rather than rejected —
 * managers legitimately schedule Training, Cover or a one-off role. Nothing
 * here creates a workspace role; the label lives on the shift alone.
 */
export function resolveRole(text: string, options: RoleResolutionOptions): RoleResolution {
  const cleaned = text.replace(/\bovernight\b/gi, " ").trim();
  if (!cleaned) return { ok: true, role: null, warning: null };

  // Free-text roles are allowed, but leftovers that are plainly mistyped input
  // rather than a role must still be rejected — otherwise "9-5 30" silently
  // becomes a shift labelled "30", "9-5 9-5" one labelled "9-5", and
  // "9-5 break 900" one labelled "Break 900".
  if (looksLikeLeftoverTime(cleaned)) {
    return { ok: false, message: `"${cleaned}" is left over from the times. ${TIME_HELP}` };
  }
  if (/\b(?:break|brk)\b/i.test(cleaned)) {
    return {
      ok: false,
      message: "That break isn't readable. Use something like 30m break, or no break.",
    };
  }

  const resolved = resolveShiftRole({
    input: cleaned,
    configuredRoles: options.roleOptions ?? [],
    profileRole: options.profileRole ?? null,
  });
  if (!resolved) return { ok: true, role: null, warning: null };
  return { ok: true, role: resolved.role, warning: resolved.warning };
}
