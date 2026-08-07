import { parseInlineCellInput, type InlineCellParseOptions } from "./inlineCellParsing";
import { CLEAR_CELL_SUMMARY } from "./inlineCellCommands";

export type InlineCellPreview = {
  /**
   * "idle" renders nothing. "error" blocks saving because the input could not be
   * understood. "blocked" also saves nothing, but the input was understood and
   * is simply not something this pilot records — it is not a mistake to fix.
   *
   * "warning" saves exactly like "ok". It means the input was understood but had
   * more than one reasonable reading, so the one that was chosen is stated back.
   * Enter still commits: a manager who meant what was read should not have to
   * dismiss anything, and a manager who did not can see it before pressing it.
   */
  tone: "idle" | "ok" | "warning" | "error" | "blocked";
  summary: string;
};

const EN_DASH = "–";
const DOT = "·";

function breakLabel(minutes: number | null): string | null {
  if (minutes === null) return null;
  return minutes === 0 ? "no break" : `${minutes}m break`;
}

/**
 * Compact, deterministic read-back of what the inline editor understood, shown
 * beneath the input while the manager types. It reports only what the parser
 * actually produced — it never guesses beyond it.
 */
export function buildInlineCellPreview(
  value: string,
  options: InlineCellParseOptions = {},
): InlineCellPreview {
  if (value.trim() === "") return { tone: "idle", summary: "" };

  const result = parseInlineCellInput(value, options);

  if (result.kind === "error") return { tone: "error", summary: result.message };

  if (result.kind === "blocked") return { tone: "blocked", summary: result.message };

  // Understood, and it does open a real action — but nothing is written to the
  // cell itself, so the shift stays until the manager decides what to do.
  if (result.kind === "record-absence")
    return { tone: "ok", summary: "Opens Record absence — the shift is not changed" };

  if (result.kind === "clear") {
    return {
      tone: "ok",
      summary: result.all ? `${CLEAR_CELL_SUMMARY} (every shift in this cell)` : CLEAR_CELL_SUMMARY,
    };
  }

  const roles = [...new Set(result.shifts.map((shift) => shift.role).filter(Boolean))];
  const sharedRole = roles.length === 1 ? roles[0]! : null;

  const segments = result.shifts.map((shift) => {
    const range = `${shift.start}${EN_DASH}${shift.end}`;
    return sharedRole === null && shift.role ? `${range} ${shift.role}` : range;
  });

  const trailing: string[] = [];
  if (sharedRole) trailing.push(sharedRole);

  const breaks = [...new Set(result.shifts.map((shift) => breakLabel(shift.breakMinutes)))];
  const sharedBreak = breaks.length === 1 ? breaks[0] : null;
  if (sharedBreak) trailing.push(sharedBreak);

  if (result.shifts.every((shift) => shift.open)) trailing.push("open");

  const summary = [segments.join(" + "), ...trailing].join(` ${DOT} `);

  // A bare-hour range that was read as a morning shift says so explicitly, in
  // full resolved times. The tone rises to "warning" so it is visibly a decision
  // rather than a detail, but nothing is blocked — Enter and blur still commit.
  const timeWarnings = [
    ...new Set(result.shifts.map((shift) => shift.timeWarning).filter(Boolean)),
  ];

  // An unusual or temporary role is worth saying out loud, but it saves
  // normally — the tone stays "ok" so Enter and blur still commit.
  const roleWarnings = [
    ...new Set(result.shifts.map((shift) => shift.roleWarning).filter(Boolean)),
  ];

  const notes = [...timeWarnings, ...roleWarnings];
  if (notes.length === 0) return { tone: "ok", summary };
  return {
    tone: timeWarnings.length > 0 ? "warning" : "ok",
    summary: `${summary} — ${notes.join(" · ")}`,
  };
}
