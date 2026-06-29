import { toast } from "sonner";
import type { DraftShift, RotaDayIndex, RotaGridCell as RotaGridCellData } from "../../types";
import type { ShiftActionHandlers } from "./types";
import { parseInlineCellInput, type ParsedInlineShift } from "./inlineCellParsing";

type CommitInlineCellEditInput = {
  value: string;
  cell: RotaGridCellData;
  handlers: ShiftActionHandlers;
  staffId?: string | null;
  staffRole?: string;
  openRow: boolean;
  dayIndex: number;
};

function roleOptions(cell: RotaGridCellData, staffRole?: string): string[] {
  return Array.from(
    new Set([staffRole, ...cell.shifts.map((shift) => shift.role)].filter(Boolean)),
  ) as string[];
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
  const command = parseInlineCellInput(value, {
    defaultRole: staffRole ?? firstShift?.role ?? "FOH",
    roleOptions: roleOptions(cell, staffRole),
  });

  if (command.kind === "error") {
    toast.error("Invalid rota entry", { description: command.message });
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
