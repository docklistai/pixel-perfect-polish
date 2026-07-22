import { toast } from "sonner";
import type { DraftShift, RotaDayIndex, RotaGridCell as RotaGridCellData } from "../../types";
import type { ShiftActionHandlers } from "./types";
import {
  parseInlineCellInput,
  type InlineCellParseOptions,
  type ParsedInlineShift,
} from "./inlineCellParsing";

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

function buildShiftPatch({
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
    if (cell.shifts.length > 1 && !command.all) {
      toast.warning("Multiple shifts in this cell", {
        description: "Open a shift menu to clear one shift, or type clear all to remove both.",
      });
      return;
    }
    for (const shift of cell.shifts) await handlers.onShiftClear(shift.id);
    return;
  }

  if (cell.shifts.length > 1 && command.shifts.length === 1) {
    toast.warning("Choose a specific split shift", {
      description: "Open a shift pill to edit one shift, or enter matching split ranges.",
    });
    return;
  }
  if (cell.shifts.length > 1 && command.shifts.length !== cell.shifts.length) {
    toast.warning("Split edit needs matching ranges", {
      description: `This cell has ${cell.shifts.length} shifts. Enter ${cell.shifts.length} ranges or edit one shift from its menu.`,
    });
    return;
  }

  if (cell.shifts.length > 0) {
    const sorted = [...cell.shifts].sort((a, b) => a.start.localeCompare(b.start));
    for (const [index, shift] of sorted.entries()) {
      const parsed = command.shifts[index];
      if (!parsed) continue;
      await handlers.onShiftUpdate?.(
        shift.id,
        buildShiftPatch({ parsed, source: shift, staffId, staffRole, openRow }),
      );
    }
    for (const parsed of command.shifts.slice(cell.shifts.length)) {
      const patch = buildShiftPatch({ parsed, source: firstShift, staffId, staffRole, openRow });
      await handlers.onShiftAdd?.({
        dayIndex: dayIndex as RotaDayIndex,
        staffId: patch.staffId,
        role: patch.role,
        start: patch.start,
        end: patch.end,
        breakMinutes: patch.breakMinutes,
        status: patch.status,
        tone: patch.tone,
      });
    }
    if (!handlers.serverBacked) {
      toast.success(command.shifts.length > 1 ? "Split shift saved" : "Shift updated", {
        description: "Saved to draft",
      });
    }
    return;
  }

  for (const parsed of command.shifts) {
    const patch = buildShiftPatch({ parsed, staffId, staffRole, openRow });
    await handlers.onShiftAdd?.({
      dayIndex: dayIndex as RotaDayIndex,
      staffId: patch.staffId,
      role: patch.role,
      start: patch.start,
      end: patch.end,
      breakMinutes: patch.breakMinutes,
      status: patch.status,
      tone: patch.tone,
    });
  }
  if (!handlers.serverBacked) {
    toast.success(command.shifts.length > 1 ? "Split shift created" : "Shift created");
  }
}
