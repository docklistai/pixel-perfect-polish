import type { DraftShift } from "../../../types";
import { refuseSplitMismatch } from "../inlineCommitRules";
import { buildShiftPatch, shiftPatchToInput } from "../inlineShiftPatch";
import { targetLeaveWarning, type RotaCellTextPlan } from "./rotaCellTextPlan";
import type { RotaBulkOp, RotaBulkTarget } from "./rotaBulkPlan";

/**
 * Plans one cell from real shifts rather than from text.
 *
 * Fill and repeat move shifts the manager can already see, so there is nothing to
 * parse. The previous implementation serialised the source cell into the inline
 * editor's grammar and read it straight back, which meant a structured operation
 * inherited every ambiguity of a text format:
 *
 * - a role literally named "Open" or "Overnight" was consumed as a keyword, so the
 *   shift came back unassigned with its role stripped;
 * - a role containing "/" had to be refused outright, because "/" separates the
 *   halves of a split shift;
 * - `colourOverride` had no representation at all and was silently dropped.
 *
 * Reading the fields directly removes all three. The arbitration is deliberately
 * identical to the text path — same split-mismatch rule, same assignment
 * precedence, same warnings — so a fill can never mean something a paste would
 * not.
 */

/** Departments follow the target, matching the text path. See DEPARTMENT_NOTE. */
export function planRotaCellFromShifts({
  target,
  sourceShifts,
}: {
  target: RotaBulkTarget;
  /** The source cell's shifts, in start order. Empty clears the target. */
  sourceShifts: readonly DraftShift[];
}): RotaCellTextPlan {
  const refuse = (message: string): RotaCellTextPlan => ({
    ok: false,
    blocker: { label: target.label, message },
  });

  const existing = [...target.cell.shifts].sort((a, b) => a.start.localeCompare(b.start));
  const desired = [...sourceShifts].sort((a, b) => a.start.localeCompare(b.start));
  const ops: RotaBulkOp[] = [];
  const warnings: string[] = [];

  // An empty source is a real instruction — Excel blanks the range — so it clears
  // the target rather than being ignored.
  if (desired.length === 0) {
    for (const shift of existing) ops.push({ kind: "remove", shiftId: shift.id });
    if (existing.length > 1) {
      warnings.push(`${existing.length} shifts in this cell will be cleared`);
    }
    return { ok: true, plan: { key: target.key, label: target.label, ops, warnings } };
  }

  const mismatch = refuseSplitMismatch(existing.length, desired.length);
  if (mismatch) return refuse(mismatch.description);

  for (const [index, source] of desired.entries()) {
    const replaced = existing[index];
    // Assignment follows the target: an open source dropped onto a staff row is
    // assigned to that person, and the Open row always produces open shifts.
    const built = buildShiftPatch({
      parsed: {
        start: source.start,
        end: source.end,
        role: source.role,
        breakMinutes: source.breakMinutes,
        open: false,
      },
      source: replaced,
      staffId: target.staffId,
      staffRole: target.staffRole,
      openRow: target.openRow,
    });
    if (!built.ok) return refuse(built.message);

    // Chip colour is presentation carried with the shift. The text grammar could
    // not represent it, so filling used to reset it to the role default.
    const patch = {
      ...built.patch,
      ...(source.colourOverride !== undefined ? { colourOverride: source.colourOverride } : {}),
    };

    if (replaced) ops.push({ kind: "update", shiftId: replaced.id, patch });
    else ops.push({ kind: "create", input: shiftPatchToInput(patch, target.key.day) });

    if (target.openRow) warnings.push("will be created in the Open shifts row, unassigned");
    else if (patch.staffId === null) warnings.push("will be unassigned and move to Open shifts");
    else if (replaced && replaced.staffId === null)
      warnings.push("an open shift will be assigned here");
  }

  // Anything beyond the source's own shifts would have been caught by the split
  // rule above, so a leftover here is a genuine extra shift being removed.
  for (const shift of existing.slice(desired.length)) {
    ops.push({ kind: "remove", shiftId: shift.id });
  }

  const constraint = ops.some((op) => op.kind !== "remove") ? targetLeaveWarning(target) : null;
  if (constraint) warnings.push(constraint);

  return {
    ok: true,
    plan: { key: target.key, label: target.label, ops, warnings: [...new Set(warnings)] },
  };
}
