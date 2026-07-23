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
 */
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
}) {
  const open = openRow || parsed.open || !staffId;
  return {
    staffId: open ? null : staffId || null,
    role: parsed.role ?? staffRole ?? source?.role ?? "FOH",
    start: parsed.start,
    end: parsed.end,
    ...(parsed.breakMinutes !== null ? { breakMinutes: parsed.breakMinutes } : {}),
    status: open ? ("open" as const) : ("scheduled" as const),
    tone: open ? ("open" as const) : ("info" as const),
    edited: true,
  };
}

export type InlineShiftPatch = ReturnType<typeof buildShiftPatch>;

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
  };
}
