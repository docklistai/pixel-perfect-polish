import { parseInlineCellInput } from "../inlineCellParsing";
import { RANGE_PATTERN } from "../shiftTimeTokens";
import { buildInlineParseOptions } from "../inlineCellCommit";
import { refuseAmbiguousClear, refuseSplitMismatch } from "../inlineCommitRules";
import { buildShiftPatch, shiftPatchToInput } from "../inlineShiftPatch";
import { roleHasAmbiguousSlash, SLASH_ROLE_MESSAGE } from "./rotaSlashRoleGuard";
import type { RotaBulkBlocker, RotaBulkCellPlan, RotaBulkOp, RotaBulkTarget } from "./rotaBulkPlan";

export type RotaCellTextPlan =
  | { ok: true; plan: RotaBulkCellPlan }
  | { ok: false; blocker: RotaBulkBlocker };

/** Shared with the structured planner so both surfaces warn identically. */
export function targetLeaveWarning(target: RotaBulkTarget): string | null {
  if (target.openRow) return null;
  if (target.cell.leaveState === "approved") return "has approved leave — this will be a conflict";
  if (target.cell.leaveState === "pending") return "has a pending leave request";
  if (target.cell.availabilityHint === "unavailable") return "is marked unavailable";
  if (target.cell.availabilityHint === "day-off") return "has an approved recurring day off";
  return null;
}

/**
 * Whether a failed parse is really a role written with a slash.
 *
 * "/" separates the halves of a split shift, so a role such as "Bar / Kitchen"
 * is read as two ranges and fails on the half that carries no time at all.
 * Repeating the time format there would send the manager looking for a problem
 * with their times; naming the slash is what actually explains it. A genuine
 * split with bad times has a range in every half and keeps the time message.
 */
function readsAsSlashRole(text: string): boolean {
  if (!text.includes("/")) return false;
  return text.split("/").some((segment) => !RANGE_PATTERN.test(segment));
}

/**
 * Plans one cell from one piece of cell text, without writing anything.
 *
 * This is the same grammar, the same arbitration rules and the same field
 * mapping the inline editor uses — a bulk write is never allowed to mean
 * something a single typed edit would not. The difference is only that a
 * refusal becomes a blocker the manager reads before confirming, instead of a
 * toast fired half way through.
 */
export function planRotaCellFromText({
  target,
  text,
  workspaceRoles,
}: {
  target: RotaBulkTarget;
  text: string;
  workspaceRoles?: readonly string[];
}): RotaCellTextPlan {
  const refuse = (message: string): RotaCellTextPlan => ({
    ok: false,
    blocker: { label: target.label, message },
  });

  const existing = [...target.cell.shifts].sort((a, b) => a.start.localeCompare(b.start));
  if (existing.some((shift) => roleHasAmbiguousSlash(shift.role))) {
    return refuse(`This cell cannot be replaced in bulk: ${SLASH_ROLE_MESSAGE}`);
  }

  const ops: RotaBulkOp[] = [];
  const warnings: string[] = [];
  const trimmed = text.trim();

  // An empty field in a pasted rectangle means "this cell is empty". Unlike a
  // typed `clear`, there is no ambiguity about which shift is meant — the whole
  // cell is being replaced by an empty one.
  if (trimmed === "") {
    for (const shift of existing) ops.push({ kind: "remove", shiftId: shift.id });
    if (existing.length > 1)
      warnings.push(`${existing.length} shifts in this cell will be cleared`);
    return { ok: true, plan: { key: target.key, label: target.label, ops, warnings } };
  }

  const parsed = parseInlineCellInput(
    trimmed,
    buildInlineParseOptions({ cell: target.cell, staffRole: target.staffRole, workspaceRoles }),
  );

  if (parsed.kind === "error") {
    if (readsAsSlashRole(trimmed))
      return refuse(`This cell cannot be written: ${SLASH_ROLE_MESSAGE}`);
    return refuse(parsed.message);
  }
  // Recognised, but deliberately not recorded from the grid. It must block the
  // whole apply rather than quietly writing nothing for this one cell.
  if (parsed.kind === "blocked")
    return refuse(`"${trimmed}" is not saved from the rota. ${parsed.message}.`);

  // Recording an absence is a single deliberate action, never a bulk paste
  // side effect, so it refuses the whole apply rather than writing anything.
  if (parsed.kind === "record-absence")
    return refuse(`"${trimmed}" opens Record absence — it cannot be pasted into cells.`);

  if (parsed.kind === "clear") {
    const refusal = refuseAmbiguousClear(existing.length, parsed.all);
    if (refusal) return refuse(refusal.description);
    for (const shift of existing) ops.push({ kind: "remove", shiftId: shift.id });
    return { ok: true, plan: { key: target.key, label: target.label, ops, warnings } };
  }

  const mismatch = refuseSplitMismatch(existing.length, parsed.shifts.length);
  if (mismatch) return refuse(mismatch.description);

  for (const [index, shift] of parsed.shifts.entries()) {
    if (shift.roleWarning) warnings.push(shift.roleWarning);
    if (roleHasAmbiguousSlash(shift.role)) {
      return refuse(`The pasted role cannot be stored: ${SLASH_ROLE_MESSAGE}`);
    }
    const source = existing[index];
    const built = buildShiftPatch({
      parsed: shift,
      source,
      staffId: target.staffId,
      staffRole: target.staffRole,
      openRow: target.openRow,
    });
    // A role that cannot be resolved is a refusal, not a hardcoded default. In
    // bulk it becomes a blocker the manager reads before confirming anything.
    if (!built.ok) return refuse(built.message);
    const patch = built.patch;
    if (source) ops.push({ kind: "update", shiftId: source.id, patch });
    else ops.push({ kind: "create", input: shiftPatchToInput(patch, target.key.day) });

    if (target.openRow) warnings.push("will be created in the Open shifts row, unassigned");
    else if (patch.staffId === null) warnings.push("will be unassigned and move to Open shifts");
    else if (source && source.staffId === null)
      warnings.push("an open shift will be assigned here");
  }

  // Ranges beyond the ones already in the cell would have been refused by the
  // split rule above, so anything left over is a genuine extra shift.
  for (const shift of existing.slice(parsed.shifts.length)) {
    ops.push({ kind: "remove", shiftId: shift.id });
  }

  const constraint = ops.some((op) => op.kind !== "remove") ? targetLeaveWarning(target) : null;
  if (constraint) warnings.push(constraint);

  return {
    ok: true,
    plan: { key: target.key, label: target.label, ops, warnings: [...new Set(warnings)] },
  };
}
