import * as React from "react";
import { ShiftCell } from "../ShiftCell";
import { cellLeaveTitle } from "./cellLeaveTitle";
import { InlineCellEditor } from "./InlineCellEditor";
import { commitInlineCellEdit } from "./inlineCellCommit";
import { buildRotaCellAccessibleName, nextRotaGridPosition } from "./rotaGridAccessibility";
import type { RotaGridDay, ShiftActionHandlers, ShiftMenuHandlers } from "./types";
import type { RotaGridCell as RotaGridCellData, ShiftId } from "../../types";

export function RotaGridCell({
  cell,
  day,
  context,
  cellLabel,
  openRow = false,
  handlers,
  staffId,
  staffRole,
  dayIndex,
  rowIndex,
  isTabStop,
  onFocus,
}: {
  cell: RotaGridCellData;
  day: RotaGridDay | undefined;
  context: "staff" | "open";
  cellLabel: string;
  openRow?: boolean;
  handlers: ShiftActionHandlers;
  staffId?: string | null;
  staffRole?: string;
  dayIndex: number;
  rowIndex: number;
  isTabStop: boolean;
  onFocus: (rowIndex: number, dayIndex: number) => void;
}) {
  const cellRef = React.useRef<HTMLDivElement>(null);
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
  const availabilityClass =
    !openRow && !cell.leaveState && cell.availabilityHint ? "bg-muted/10" : "";

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
  const restoreCellFocus = React.useCallback(() => {
    requestAnimationFrame(() => cellRef.current?.focus());
  }, []);

  const handleCommit = async (val: string) => {
    setIsEditing(false);
    restoreCellFocus();
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
    if (e.target !== e.currentTarget) return;
    if (
      e.key === "ArrowRight" ||
      e.key === "ArrowLeft" ||
      e.key === "ArrowUp" ||
      e.key === "ArrowDown"
    ) {
      e.preventDefault();
      const next = nextRotaGridPosition(rowIndex, dayIndex, e.key);
      const grid = e.currentTarget.closest("[data-rota-grid]");
      const target = grid?.querySelector<HTMLElement>(
        '[data-gridrow="' + next.rowIndex + '"][data-gridcol="' + next.dayIndex + '"]',
      );
      target?.focus();
      return;
    }
    if (e.key === "Enter" || e.key === " ") {
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

  const cellAriaLabel = buildRotaCellAccessibleName({
    cellLabel,
    shifts: cell.shifts,
    readOnly: handlers.readOnly,
    leaveState: cell.leaveState,
    availabilityHint: cell.availabilityHint,
  });
  const availabilityTitle =
    cell.availabilityHint === "unavailable"
      ? "Approved one-off unavailability"
      : cell.availabilityHint === "day-off"
        ? "Approved recurring day off"
        : undefined;

  return (
    <div
      ref={cellRef}
      tabIndex={isTabStop ? 0 : -1}
      role="gridcell"
      aria-label={cellAriaLabel}
      aria-colindex={dayIndex + 2}
      aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight Enter Space F2"
      title={cellLeaveTitle(cell.leaveState, Boolean(firstShift)) ?? availabilityTitle}
      data-gridrow={rowIndex}
      data-gridcol={dayIndex}
      onFocus={() => onFocus(rowIndex, dayIndex)}
      onDoubleClick={startEditing}
      onClick={() => {
        if (!firstShift) startEditing();
      }}
      onKeyDown={handleKeyDown}
      className={`relative border-b border-l px-2 py-2 select-none outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-within:ring-1 focus-within:ring-brand/30 ${
        day?.isToday ? todayClass : defaultClass
      } ${leaveClass} ${availabilityClass}`}
    >
      {cell.leaveState && !firstShift && !isEditing && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span
            className={`text-[10px] font-semibold uppercase ${
              cell.leaveState === "approved" ? "text-muted-foreground/40" : "text-warning/60"
            }`}
          >
            {cell.leaveLabel ?? (cell.leaveState === "approved" ? "Leave" : "Pending")}
          </span>
        </div>
      )}
      {!cell.leaveState && cell.availabilityHint && !firstShift && !isEditing && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span
            className={
              cell.availabilityHint === "unavailable"
                ? "text-[10px] font-medium text-muted-foreground/60"
                : "text-[10px] text-muted-foreground/40"
            }
          >
            {cell.availabilityHint === "unavailable" ? "Unavailable" : "Day off"}
          </span>
        </div>
      )}
      {isEditing ? (
        <InlineCellEditor
          initial={initialValue}
          contextLabel={cellLabel}
          onCommit={handleCommit}
          onCancel={() => {
            setIsEditing(false);
            restoreCellFocus();
          }}
        />
      ) : (
        <ShiftCell
          shifts={cell.shifts}
          context={context}
          menuHandlers={menuHandlers}
          openMenuShiftId={openMenuShiftId}
          onMenuOpenChange={(shiftId, open) => {
            setOpenMenuShiftId(open ? shiftId : null);
            if (!open) restoreCellFocus();
          }}
          emptyAriaLabel={cellLabel + ": no shift"}
        />
      )}
    </div>
  );
}
