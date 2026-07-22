import { endMinutesOf, parseTimeRange, RANGE_PATTERN } from "./shiftTimeTokens";
import { matchInlineCellCommand } from "./inlineCellCommands";

export { parseTimeRange } from "./shiftTimeTokens";

export type ParsedInlineShift = {
  start: string;
  end: string;
  role: string | null;
  breakMinutes: number | null;
  open: boolean;
};

export type InlineCellParseResult =
  | { kind: "clear"; all: boolean }
  | { kind: "shifts"; shifts: ParsedInlineShift[] }
  /** A recognised command this pilot deliberately does not record. Saves nothing. */
  | { kind: "blocked"; message: string }
  | { kind: "error"; message: string };

export type InlineCellParseOptions = {
  defaultRole?: string;
  /** Roles the manager is allowed to name. Unmatched role text is never invented. */
  roleOptions?: string[];
};

const TIME_HELP = "Use times like 9-5, 22:00-02:00, open 6pm-11pm bar, or 9-12 / 17-22.";

/** "break 30", "30m break", "30 min break", "30 minutes break", "no break". */
const BREAK_PREFIX = /\b(?:break|brk)\s*(\d{1,3})\s*(?:m|mins?|minutes?)?\b/i;
const BREAK_SUFFIX = /\b(\d{1,3})\s*(?:m|mins?|minutes?)?\s*(?:break|brk)\b/i;

function normaliseToken(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function extractBreakMinutes(input: string): { text: string; breakMinutes: number | null } {
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

type RoleResolution = { ok: true; role: string | null } | { ok: false; text: string };

/**
 * Matches leftover text against the permitted roles. Text that matches nothing
 * is reported so the caller can raise a parse error — a mistyped or unknown role
 * must never be turned into a brand-new role name.
 */
function resolveRole(text: string, options: InlineCellParseOptions): RoleResolution {
  const compact = normaliseToken(text.replace(/\bovernight\b/gi, " "));
  if (!compact) return { ok: true, role: null };

  const roleOptions = options.roleOptions ?? [];
  // Nothing to validate against (e.g. an empty open row): leave the role unset
  // and let the commit path fall back to its existing default.
  if (roleOptions.length === 0) return { ok: true, role: null };

  const direct = roleOptions.find((role) => normaliseToken(role) === compact);
  if (direct) return { ok: true, role: direct };

  const contained = roleOptions.find((role) => {
    const roleKey = normaliseToken(role);
    return compact.includes(roleKey) || roleKey.includes(compact);
  });
  if (contained) return { ok: true, role: contained };

  return { ok: false, text: compact };
}

type SegmentResult = { ok: true; shift: ParsedInlineShift } | { ok: false; message: string };

function parseShiftSegment(
  input: string,
  options: InlineCellParseOptions,
  previousEndMinutes: number | null,
): SegmentResult {
  const open = /\b(open|unassigned)\b/i.test(input);
  const { text: withoutBreak, breakMinutes } = extractBreakMinutes(input);
  const rangeMatch = withoutBreak.match(RANGE_PATTERN);
  if (!rangeMatch) return { ok: false, message: TIME_HELP };

  const range = parseTimeRange(rangeMatch[0], previousEndMinutes);
  if (!range) return { ok: false, message: TIME_HELP };

  const roleText = withoutBreak
    .replace(rangeMatch[0], " ")
    .replace(/\b(open|unassigned|overnight)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  const role = resolveRole(roleText, options);
  if (!role.ok) {
    const permitted = (options.roleOptions ?? []).join(", ");
    return {
      ok: false,
      message: `"${role.text}" is not one of your roles${permitted ? ` (${permitted})` : ""}. Use an existing role, or leave it out to keep the current one.`,
    };
  }

  return { ok: true, shift: { ...range, role: role.role, breakMinutes, open } };
}

export function parseInlineCellInput(
  input: string,
  options: InlineCellParseOptions = {},
): InlineCellParseResult {
  const trimmed = input.trim();
  if (!trimmed) return { kind: "clear", all: false };

  const command = matchInlineCellCommand(trimmed);
  if (command) return command;

  if (/^(?:open|unassigned)$/i.test(trimmed)) {
    return {
      kind: "shifts",
      shifts: [
        {
          start: "09:00",
          end: "17:00",
          role: options.defaultRole ?? null,
          breakMinutes: null,
          open: true,
        },
      ],
    };
  }

  const segments = trimmed
    .split(/\s*(?:\/|\+|,)\s*/)
    .map((segment) => segment.trim())
    .filter(Boolean);

  const shifts: ParsedInlineShift[] = [];
  let previousEndMinutes: number | null = null;
  for (const segment of segments) {
    const result = parseShiftSegment(segment, options, previousEndMinutes);
    if (!result.ok) return { kind: "error", message: result.message };
    shifts.push(result.shift);
    previousEndMinutes = endMinutesOf(result.shift);
  }

  return { kind: "shifts", shifts: applySharedRole(shifts) };
}

/**
 * "9-12, 5-10 Bar" means both halves are on the bar. A role named exactly once
 * across a split cell fills the segments that named none; a cell that names two
 * different roles is left exactly as written.
 */
function applySharedRole(shifts: ParsedInlineShift[]): ParsedInlineShift[] {
  const named = [...new Set(shifts.map((shift) => shift.role).filter(Boolean))];
  if (named.length !== 1) return shifts;
  return shifts.map((shift) => (shift.role === null ? { ...shift, role: named[0]! } : shift));
}
