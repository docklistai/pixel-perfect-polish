import * as React from "react";
import { buildInlineParseOptions, commitInlineCellEdit } from "./inlineCellCommit";
import type { ShiftActionHandlers, ShiftMenuHandlers } from "./types";
import type { DraftShift, RotaGridCell as RotaGridCellData, ShiftId } from "../../types";

export type RotaCellInteractionInput = {
  cell: RotaGridCellData;
  handlers: ShiftActionHandlers;
  staffId?: string | null;
  staffRole?: string;
  openRow: boolean;
  dayIndex: number;
  /**
   * Grid-level key routing (arrows, selection, copy). Returns true when it has
   * consumed the event, in which case the cell's own shortcuts stay out of the
   * way.
   */
  onGridKeyDown?: (event: React.KeyboardEvent<HTMLDivElement>) => boolean;
};

/**
 * Everything a rota cell does on its own: opening the inline editor, committing
 * what was typed, driving the per-shift action menu, and the cell-local
 * shortcuts (Enter/Space, F2, M).
 *
 * Selection and navigation deliberately live outside this hook — a cell knows
 * how to edit itself and nothing about the rectangle it may be part of.
 */
export function useRotaCellInteraction({
  cell,
  handlers,
  staffId,
  staffRole,
  openRow,
  dayIndex,
  onGridKeyDown,
}: RotaCellInteractionInput) {
  const cellRef = React.useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = React.useState(false);
  const [openMenuShiftId, setOpenMenuShiftId] = React.useState<ShiftId | null>(null);

  const firstShift: DraftShift | undefined = cell.shifts[0];
  const initialValue = firstShift
    ? cell.shifts.length > 1
      ? `${cell.shifts.length} shifts`
      : firstShift.status === "open"
        ? "OPEN"
        : `${firstShift.start} - ${firstShift.end}`
    : "OFF";

  const startEditing = React.useCallback(() => {
    if (handlers.readOnly) {
      handlers.onReadOnlyAttempt();
      return;
    }
    setIsEditing(true);
  }, [handlers]);

  const restoreCellFocus = React.useCallback(() => {
    requestAnimationFrame(() => cellRef.current?.focus());
  }, []);

  const cancelEditing = React.useCallback(() => {
    setIsEditing(false);
    restoreCellFocus();
  }, [restoreCellFocus]);

  const parseOptions = React.useMemo(
    () => buildInlineParseOptions({ cell, staffRole, workspaceRoles: handlers.workspaceRoles }),
    [cell, staffRole, handlers.workspaceRoles],
  );

  const handleCommit = async (value: string) => {
    setIsEditing(false);
    restoreCellFocus();
    if (handlers.readOnly) {
      handlers.onReadOnlyAttempt();
      return;
    }
    try {
      await commitInlineCellEdit({
        value,
        cell,
        handlers,
        staffId,
        staffRole,
        openRow,
        dayIndex,
      });
    } catch {
      // The server mutation hook owns the failure toast; keep the cell from
      // reporting a successful edit when persistence fails.
    }
  };

  const menuHandlers = React.useMemo<ShiftMenuHandlers>(
    () => ({
      duplicateBlockedReason: handlers.duplicateBlockedReason,
      onEditInline: startEditing,
      onOpen: handlers.onShiftOpen,
      onDuplicate: handlers.onShiftDuplicate,
      onMarkOpen: handlers.onShiftMarkOpen,
      onSetDept: handlers.onShiftSetDept,
      onSetDepartment: handlers.onShiftSetDepartment,
      departments: handlers.departments,
      onSetColour: handlers.onShiftSetColour,
      onResetColour: handlers.onShiftResetColour,
      onClear: handlers.onShiftClear,
    }),
    [handlers, startEditing],
  );

  const handleMenuOpenChange = React.useCallback(
    (shiftId: ShiftId, open: boolean) => {
      setOpenMenuShiftId(open ? shiftId : null);
      if (!open) restoreCellFocus();
    },
    [restoreCellFocus],
  );

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    // The inline editor owns its keys (↵ save / esc cancel).
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)
      return;
    if (event.target !== event.currentTarget) return;
    if (onGridKeyDown?.(event)) return;

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (firstShift) handlers.onShiftOpen(firstShift.id);
      else startEditing();
    }
    if (event.key === "F2") {
      event.preventDefault();
      startEditing();
    }
    if (event.key === "m" || event.key === "M") {
      event.preventDefault();
      if (firstShift) setOpenMenuShiftId(firstShift.id);
      else startEditing();
    }
  };

  return {
    cellRef,
    firstShift,
    initialValue,
    isEditing,
    openMenuShiftId,
    parseOptions,
    menuHandlers,
    startEditing,
    cancelEditing,
    handleCommit,
    handleKeyDown,
    handleMenuOpenChange,
  };
}
