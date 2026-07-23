import type { DraftShift } from "../../../types";

/**
 * Turns selected rota cells into tab-separated text for Excel and Google Sheets.
 *
 * Every field is written in the exact grammar the inline cell editor already
 * accepts (`inlineCellParsing.ts`), so what a manager copies reads back as the
 * same shifts. Two rules make that round-trip deterministic rather than merely
 * likely:
 *
 * - Times are always zero-padded 24-hour. `parseTimePart` treats a two-digit
 *   hour as explicitly 24-hour, which switches off every afternoon inference —
 *   `09:00` can only ever mean 9am, whereas `9:00` is open to interpretation.
 * - The break is written on each segment, never once at the end. A trailing
 *   break would attach to the last segment alone and silently reset the others
 *   to the 30-minute default.
 *
 * A role shared by every segment still trails the cell, because `applySharedRole`
 * fans it back out across the split; differing roles stay on their own segment.
 */

const CELL_SEPARATOR = "\t";
const ROW_SEPARATOR = "\n";
const SEGMENT_SEPARATOR = " / ";

/** Strips anything that would break the TSV grid out of free-text role labels. */
function safeText(value: string): string {
  return value.replace(/[\t\r\n]+/g, " ").trim();
}

function normaliseTime(value: string): string {
  const match = /^(\d{1,2}):(\d{1,2})$/.exec(value.trim());
  if (!match) return safeText(value);
  return `${match[1]!.padStart(2, "0")}:${match[2]!.padStart(2, "0")}`;
}

function breakToken(minutes: number): string | null {
  if (!Number.isInteger(minutes) || minutes < 0) return null;
  return minutes === 0 ? "no break" : `${minutes}m break`;
}

function roleToken(shift: DraftShift): string | null {
  const role = safeText(shift.role ?? "");
  return role.length > 0 ? role : null;
}

/** Split cells read left-to-right in start-time order, matching the commit path. */
function orderedShifts(shifts: readonly DraftShift[]): DraftShift[] {
  return [...shifts].sort((a, b) => normaliseTime(a.start).localeCompare(normaliseTime(b.start)));
}

export type SerialiseRotaCellOptions = {
  /**
   * Drop the leading "open" token. Fill uses this so assignment follows the
   * target cell — an open shift filled onto a staff row is assigned to that
   * staff member, not repeated as open. Copy leaves it in, because clipboard
   * text is literal and must round-trip an open shift as open.
   */
  omitOpenToken?: boolean;
};

function segment(shift: DraftShift, withRole: boolean, options: SerialiseRotaCellOptions): string {
  const parts: string[] = [];
  if (shift.staffId === null && !options.omitOpenToken) parts.push("open");
  parts.push(`${normaliseTime(shift.start)}-${normaliseTime(shift.end)}`);
  const role = withRole ? roleToken(shift) : null;
  if (role) parts.push(role);
  const brk = breakToken(shift.breakMinutes);
  if (brk) parts.push(brk);
  return parts.join(" ");
}

/**
 * One TSV field. An empty cell serialises to an empty field, which is also the
 * inline editor's "clear" input — copying a blank cell means a blank cell.
 */
export function serialiseRotaCell(
  shifts: readonly DraftShift[],
  options: SerialiseRotaCellOptions = {},
): string {
  if (shifts.length === 0) return "";
  const ordered = orderedShifts(shifts);
  if (ordered.length === 1) return segment(ordered[0]!, true, options);

  const roles = [...new Set(ordered.map(roleToken))];
  const sharedRole = roles.length === 1 ? roles[0] : null;
  const body = ordered
    .map((shift) => segment(shift, sharedRole === null, options))
    .join(SEGMENT_SEPARATOR);
  return sharedRole ? `${body} ${sharedRole}` : body;
}

/**
 * The selected rectangle as TSV: rows top to bottom, days left to right, no
 * trailing newline. Shape is preserved exactly, including empty rows and
 * columns, so the paste target in a spreadsheet matches the rota on screen.
 */
export function serialiseRotaSelectionTsv(
  rows: readonly (readonly (readonly DraftShift[])[])[],
): string {
  return rows
    .map((cells) => cells.map((shifts) => serialiseRotaCell(shifts)).join(CELL_SEPARATOR))
    .join(ROW_SEPARATOR);
}
