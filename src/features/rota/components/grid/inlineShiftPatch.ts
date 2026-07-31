import type { DraftShift, DraftShiftInput, RotaDayIndex } from "../../types";
import type { ParsedInlineShift } from "./inlineCellParsing";

/**
 * Turns one parsed range into the shift fields to write.
 *
 * Department is deliberately absent. Leaving it out is what makes target context
 * win: the server keeps an existing shift's own department on update, and
 * resolves a new shift's department from the target staff member (or the
 * workspace default for an open shift). A department is therefore never carried
 * across staff by an edit or a paste.
 *
 * A role is never invented. This used to fall back to a hardcoded "FOH" when
 * nothing else supplied one, which in a workspace without an FOH role produced a
 * shift labelled with a role nobody holds — and, because eligibility is exact,
 * one the planner could then never staff. When no role can be resolved the caller
 * is told to ask for one.
 */

export const ROLE_REQUIRED_MESSAGE =
  "Name a role for this shift, for example 9-5 Bar. Open-row shifts have no staff member to take a role from.";

export type BuildShiftPatchResult =
  | { ok: true; patch: InlineShiftPatch }
  | { ok: false; message: string };

export type InlineShiftPatch = {
  staffId: string | null;
  role: string;
  start: string;
  end: string;
  breakMinutes?: number;
  status: "open" | "scheduled";
  tone: "open" | "info";
  edited: true;
  /**
   * Chip colour, set only by structured operations. Text can never carry it, so
   * the inline and paste paths leave it absent and the shift keeps whatever it
   * already had.
   */
  colourOverride?: string;
};

export function buildShiftPatch({
  parsed,
  source,
  staffId,
  staffRole,
  openRow,
}: {
  parsed: ParsedInlineShift;
  source?: DraftShift;
  staffId?: string | null;
  staffRole?: string;
  openRow: boolean;
}): BuildShiftPatchResult {
  const open = openRow || parsed.open || !staffId;
  // Precedence: what was typed, then the target staff member's own role, then the
  // role already on the shift being replaced. Nothing beyond that is a guess.
  const role = parsed.role ?? staffRole ?? source?.role ?? null;
  if (role === null) return { ok: false, message: ROLE_REQUIRED_MESSAGE };

  return {
    ok: true,
    patch: {
      staffId: open ? null : staffId || null,
      role,
      start: parsed.start,
      end: parsed.end,
      ...(parsed.breakMinutes !== null ? { breakMinutes: parsed.breakMinutes } : {}),
      status: open ? "open" : "scheduled",
      tone: open ? "open" : "info",
      edited: true,
    },
  };
}

/** The same fields as a create input, for a cell that holds no shift yet. */
export function shiftPatchToInput(patch: InlineShiftPatch, dayIndex: number): DraftShiftInput {
  return {
    dayIndex: dayIndex as RotaDayIndex,
    staffId: patch.staffId,
    role: patch.role,
    start: patch.start,
    end: patch.end,
    breakMinutes: patch.breakMinutes,
    status: patch.status,
    tone: patch.tone,
    ...(patch.colourOverride !== undefined ? { colourOverride: patch.colourOverride } : {}),
  };
}
