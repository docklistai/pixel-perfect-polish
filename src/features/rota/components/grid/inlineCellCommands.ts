/**
 * Explicit operational commands a manager can type into a rota cell.
 *
 * Two kinds live here. `clear` commands act on the draft. `blocked` commands are
 * words managers reach for out of habit — holiday, sick, unavailable — that this
 * pilot deliberately does not record from the grid. They are recognised so the
 * manager gets a straight answer and a pointer to the surface that does own the
 * record, instead of a parse error. A blocked command never writes anything: no
 * shift, and above all no fake leave, sickness or availability entry.
 */

export type InlineCellCommand =
  | { kind: "clear"; all: boolean }
  | { kind: "blocked"; message: string };

const LEAVE_MESSAGE = "Use Leave to record or approve holiday";
const UNAVAILABLE_MESSAGE = "Use staff unavailability to record this";
const SICKNESS_MESSAGE = "Sickness recording is not available in this pilot";

/** What clearing a cell does — and, explicitly, what it does not do. */
export const CLEAR_CELL_SUMMARY =
  "No shift scheduled — this does not record leave or unavailability";

const CLEAR_COMMANDS = new Set(["off", "day off", "no shift", "clear", "delete"]);
const CLEAR_ALL_COMMANDS = new Set(["clear all", "delete all"]);

const BLOCKED_COMMANDS = new Map<string, string>([
  ["holiday", LEAVE_MESSAGE],
  ["annual leave", LEAVE_MESSAGE],
  ["leave", LEAVE_MESSAGE],
  ["unavailable", UNAVAILABLE_MESSAGE],
  ["sick", SICKNESS_MESSAGE],
  ["sickness", SICKNESS_MESSAGE],
]);

/** Lowercase, with punctuation and repeated spaces collapsed to single spaces. */
function normaliseCommand(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Matches whole-cell commands only. Anything carrying a time range (`9-5`,
 * `open 6pm-11pm bar`) is left for the shift parser, so a real shift is never
 * swallowed by a command word.
 */
export function matchInlineCellCommand(input: string): InlineCellCommand | null {
  const key = normaliseCommand(input);
  if (!key) return null;

  if (CLEAR_ALL_COMMANDS.has(key)) return { kind: "clear", all: true };
  if (CLEAR_COMMANDS.has(key)) return { kind: "clear", all: false };

  const blocked = BLOCKED_COMMANDS.get(key);
  if (blocked) return { kind: "blocked", message: blocked };

  return null;
}
