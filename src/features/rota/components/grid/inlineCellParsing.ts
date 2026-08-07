import { endMinutesOf, parseTimeRange, RANGE_PATTERN } from "./shiftTimeTokens";
import { matchInlineCellCommand } from "./inlineCellCommands";
import { extractBreakMinutes, resolveRole, TIME_HELP } from "./inlineCellSegmentFields";
import { describeResolvedTimes } from "../../lib/scheduling/shiftTimeVocabulary";

export { parseTimeRange } from "./shiftTimeTokens";

export type ParsedInlineShift = {
  start: string;
  end: string;
  role: string | null;
  breakMinutes: number | null;
  open: boolean;
  /** Calm note when the role is unusual or temporary. Never blocks saving. */
  roleWarning?: string | null;
  /**
   * Read-back for a bare-hour range that could have meant the evening. Never
   * blocks saving either — the times stand as written and this says so.
   */
  timeWarning?: string | null;
};

export type InlineCellParseResult =
  | { kind: "clear"; all: boolean }
  | { kind: "shifts"; shifts: ParsedInlineShift[] }
  /** A recognised command this pilot deliberately does not record. Saves nothing. */
  | { kind: "blocked"; message: string }
  /** Hands off to the shared record-absence dialog. Saves nothing to the cell. */
  | { kind: "record-absence"; leaveType: "sick" }
  | { kind: "error"; message: string };

export type InlineCellParseOptions = {
  defaultRole?: string;
  /** Configured workspace roles, suggested but not enforced. */
  roleOptions?: string[];
  /** The staff member's own role, used only to explain an unusual choice. */
  profileRole?: string | null;
};

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
  if (!role.ok) return { ok: false, message: role.message };

  return {
    ok: true,
    shift: {
      start: range.start,
      end: range.end,
      role: role.role,
      breakMinutes,
      open,
      roleWarning: role.warning,
      timeWarning: range.ambiguousBareHours ? describeResolvedTimes(range.start, range.end) : null,
    },
  };
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
