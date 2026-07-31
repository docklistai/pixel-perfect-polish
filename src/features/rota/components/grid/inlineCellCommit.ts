import { toast } from "sonner";
import type { RotaGridCell as RotaGridCellData } from "../../types";
import type { ShiftActionHandlers } from "./types";
import { parseInlineCellInput, type InlineCellParseOptions } from "./inlineCellParsing";
import { refuseAmbiguousClear, refuseSplitMismatch } from "./inlineCommitRules";
import { buildShiftPatch, shiftPatchToInput, type InlineShiftPatch } from "./inlineShiftPatch";

type CommitInlineCellEditInput = {
  value: string;
  cell: RotaGridCellData;
  handlers: ShiftActionHandlers;
  staffId?: string | null;
  staffRole?: string;
  openRow: boolean;
  dayIndex: number;
};

/**
 * The single source of parse options for a cell, shared by the live preview and
 * the commit path so the manager never sees one interpretation and saves another.
 */
export function buildInlineParseOptions({
  cell,
  staffRole,
  workspaceRoles,
}: {
  cell: RotaGridCellData;
  staffRole?: string;
  workspaceRoles?: readonly string[];
}): InlineCellParseOptions {
  // Only genuinely configured roles count. Roles already sitting on this cell's
  // shifts are excluded: a temporary label like Training must still be reported
  // as temporary when the manager re-opens the cell to edit it.
  const roleOptions = Array.from(
    new Set([staffRole, ...(workspaceRoles ?? [])].filter(Boolean)),
  ) as string[];
  return {
    defaultRole: staffRole ?? cell.shifts[0]?.role ?? "FOH",
    roleOptions,
    // Used only to explain an unusual choice — never to restrict one.
    profileRole: staffRole ?? null,
  };
}

export async function commitInlineCellEdit({
  value,
  cell,
  handlers,
  staffId,
  staffRole,
  openRow,
  dayIndex,
}: CommitInlineCellEditInput): Promise<void> {
  const firstShift = cell.shifts[0];
  const command = parseInlineCellInput(
    value,
    buildInlineParseOptions({ cell, staffRole, workspaceRoles: handlers.workspaceRoles }),
  );

  if (command.kind === "error") {
    toast.error("Invalid rota entry", { description: command.message });
    return;
  }

  // Understood, but not something the grid records. Nothing is written — in
  // particular no leave, sickness or availability entry is ever fabricated here.
  if (command.kind === "blocked") {
    toast.info("Nothing saved", { description: command.message });
    return;
  }

  if (command.kind === "clear") {
    const refusal = refuseAmbiguousClear(cell.shifts.length, command.all);
    if (refusal) {
      toast.warning(refusal.title, { description: refusal.description });
      return;
    }
    for (const shift of cell.shifts) await handlers.onShiftClear(shift.id);
    return;
  }

  const mismatch = refuseSplitMismatch(cell.shifts.length, command.shifts.length);
  if (mismatch) {
    toast.warning(mismatch.title, { description: mismatch.description });
    return;
  }

  // Every patch is built before anything is written, so a cell that cannot supply
  // a role for one of its segments refuses as a whole rather than half-saving.
  const built: { source?: RotaGridCellData["shifts"][number]; patch: InlineShiftPatch }[] = [];
  const sorted = [...cell.shifts].sort((a, b) => a.start.localeCompare(b.start));
  for (const [index, parsed] of command.shifts.entries()) {
    const source = sorted[index];
    const result = buildShiftPatch({
      parsed,
      source: source ?? (cell.shifts.length > 0 ? firstShift : undefined),
      staffId,
      staffRole,
      openRow,
    });
    if (!result.ok) {
      toast.warning("Nothing saved", { description: result.message });
      return;
    }
    built.push({ source, patch: result.patch });
  }

  if (cell.shifts.length > 0) {
    for (const { source, patch } of built) {
      if (!source) continue;
      await handlers.onShiftUpdate?.(source.id, patch);
    }
    for (const { source, patch } of built) {
      if (source) continue;
      await handlers.onShiftAdd?.(shiftPatchToInput(patch, dayIndex));
    }
    if (!handlers.serverBacked) {
      toast.success(command.shifts.length > 1 ? "Split shift saved" : "Shift updated", {
        description: "Saved to draft",
      });
    }
    return;
  }

  for (const { patch } of built) {
    await handlers.onShiftAdd?.(shiftPatchToInput(patch, dayIndex));
  }
  if (!handlers.serverBacked) {
    toast.success(command.shifts.length > 1 ? "Split shift created" : "Shift created");
  }
}
