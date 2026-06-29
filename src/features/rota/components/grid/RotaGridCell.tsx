import * as React from "react";
import { ShiftCell } from "../ShiftCell";
import { InlineCellEditor } from "./InlineCellEditor";
import { commitInlineCellEdit } from "./inlineCellCommit";
import type { RotaGridDay, ShiftActionHandlers, ShiftMenuHandlers } from "./types";
import type { RotaGridCell as RotaGridCellData, ShiftId } from "../../types";

export function RotaGridCell({
  cell,
  day,
  context,
  emptyAriaLabel,
  openRow = false,
  handlers,
  staffId,
  staffRole,
  dayIndex,
  rowIndex,
}: {
  cell: RotaGridCellData;
  day: RotaGridDay | undefined;
  context: "staff" | "open";
  emptyAriaLabel: string;
  openRow?: boolean;
  handlers: ShiftActionHandlers;
  staffId?: string | null;
  staffRole?: string;
  dayIndex: number;
  rowIndex: number;
}) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [openMenuShiftId, setOpenMenuShiftId] = React.useState<ShiftId | null>(null);

  const todayClass = openRow
    ? "border-brand/20 bg-warning-soft/20"
    : "border-brand/20 bg-brand-soft/10";
  const defaultClass = openRow ? "border-border bg-warning-soft/10" : "border-border";
  const leaveClass =
    cell.leaveState === "approved" && !openRow
      ? "bg-muted/20"
      : cell.leaveState === "pending" && !openRow
        ? "bg-warning-soft/20"
        : "";

  const firstShift = cell.shifts[0];
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

  const handleCommit = async (val: string) => {
    setIsEditing(false);
    if (handlers.readOnly) {
      handlers.onReadOnlyAttempt();
      return;
    }
    try {
      await commitInlineCellEdit({
        value: val,
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
      canCopyShiftAssignment: handlers.canCopyShiftAssignment,
      onEditInline: startEditing,
      onOpen: handlers.onShiftOpen,
      onDuplicate: handlers.onShiftDuplicate,
      onMarkOpen: handlers.onShiftMarkOpen,
      onSetDept: handlers.onShiftSetDept,
      onSetColour: handlers.onShiftSetColour,
      onResetColour: handlers.onShiftResetColour,
      onClear: handlers.onShiftClear,
    }),
    [handlers, startEditing],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // The inline editor owns its keys (↵ save / esc cancel).
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    if (["ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown"].includes(e.key)) {
      e.preventDefault();
      const nr =
        e.key === "ArrowUp" ? rowIndex - 1 : e.key === "ArrowDown" ? rowIndex + 1 : rowIndex;
      const nc =
        e.key === "ArrowLeft" ? dayIndex - 1 : e.key === "ArrowRight" ? dayIndex + 1 : dayIndex;
      const grid = document.querySelector("[data-rota-grid]");
      const target = grid?.querySelector<HTMLElement>(
        `[data-gridrow="${nr}"][data-gridcol="${nc}"]`,
      );
      target?.focus();
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (firstShift) handlers.onShiftOpen(firstShift.id);
      else startEditing();
    }
    if (e.key === "F2") {
      e.preventDefault();
      startEditing();
    }
    if (e.key === "m" || e.key === "M") {
      e.preventDefault();
      if (firstShift) setOpenMenuShiftId(firstShift.id);
      else startEditing();
    }
  };

  const cellAriaLabel = firstShift
    ? undefined
    : handlers.readOnly
      ? `${emptyAriaLabel} — read-only`
      : cell.leaveState === "approved"
        ? `${emptyAriaLabel} — Approved leave, press Enter to add a shift, F2 to edit`
        : cell.leaveState === "pending"
          ? `${emptyAriaLabel} — Pending leave request, press Enter to add a shift, F2 to edit`
          : `${emptyAriaLabel} — press Enter to add a shift, F2 to edit`;

  return (
    <div
      tabIndex={0}
      role="gridcell"
      aria-label={cellAriaLabel}
      title={
        cell.leaveState && !firstShift
          ? cell.leaveState === "approved"
            ? "Approved leave"
            : "Pending leave request"
          : undefined
      }
      data-gridrow={rowIndex}
      data-gridcol={dayIndex}
      onDoubleClick={startEditing}
      onClick={() => {
        if (!firstShift) startEditing();
      }}
      onKeyDown={handleKeyDown}
      className={`relative border-b border-l px-2 py-2 select-none outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-within:ring-1 focus-within:ring-brand/30 ${
        day?.isToday ? todayClass : defaultClass
      } ${leaveClass}`}
    >
      {cell.leaveState && !firstShift && !isEditing && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span
            className={`text-[10px] font-semibold uppercase ${
              cell.leaveState === "approved" ? "text-muted-foreground/40" : "text-warning/60"
            }`}
          >
            {cell.leaveState === "approved" ? "Leave" : "Pending"}
          </span>
        </div>
      )}
      {isEditing ? (
        <InlineCellEditor
          initial={initialValue}
          onCommit={handleCommit}
          onCancel={() => setIsEditing(false)}
        />
      ) : (
        <ShiftCell
          shifts={cell.shifts}
          context={context}
          menuHandlers={menuHandlers}
          openMenuShiftId={openMenuShiftId}
          onMenuOpenChange={(shiftId, open) => setOpenMenuShiftId(open ? shiftId : null)}
          emptyAriaLabel={emptyAriaLabel}
        />
      )}
    </div>
  );
}
