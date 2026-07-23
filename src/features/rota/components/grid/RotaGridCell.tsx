import * as React from "react";
import { ShiftCell } from "../ShiftCell";
import { cellLeaveTitle } from "./cellLeaveTitle";
import { InlineCellEditor } from "./InlineCellEditor";
import { buildRotaCellAccessibleName } from "./rotaGridAccessibility";
import { useRotaCellInteraction } from "./useRotaCellInteraction";
import type { RotaCellSelectionApi, RotaGridDay, ShiftActionHandlers } from "./types";
import type { RotaGridCell as RotaGridCellData } from "../../types";

export function RotaGridCell({
  cell,
  day,
  context,
  cellLabel,
  openRow = false,
  handlers,
  selection,
  rowKey,
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
  selection: RotaCellSelectionApi;
  /** Stable row identity: `staff:<id>` or `open`. Never a row position. */
  rowKey: string;
  staffId?: string | null;
  staffRole?: string;
  dayIndex: number;
  rowIndex: number;
  isTabStop: boolean;
  onFocus: (rowIndex: number, dayIndex: number) => void;
}) {
  const cellKey = React.useMemo(() => ({ row: rowKey, day: dayIndex }), [rowKey, dayIndex]);
  const interaction = useRotaCellInteraction({
    cell,
    handlers,
    staffId,
    staffRole,
    openRow,
    dayIndex,
    onGridKeyDown: (event) => selection.onCellKeyDown(event, cellKey),
  });
  const { firstShift, isEditing } = interaction;

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

  const isSelected = selection.enabled && selection.isSelected(cellKey);
  const isAnchor = selection.enabled && selection.isAnchor(cellKey);
  // Selection is signalled by an inset ring and a corner marker on the anchor,
  // never by colour alone — these cells already carry leave and availability
  // tints that a selection tint would be indistinguishable from.
  const selectionClass = `${isSelected ? "rota-cell-selected" : ""} ${
    isAnchor ? "rota-cell-anchor" : ""
  }`;

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
      ref={interaction.cellRef}
      tabIndex={isTabStop ? 0 : -1}
      role="gridcell"
      aria-label={cellAriaLabel}
      aria-colindex={dayIndex + 2}
      aria-selected={selection.enabled ? isSelected : undefined}
      aria-keyshortcuts={
        selection.enabled
          ? "ArrowUp ArrowDown ArrowLeft ArrowRight Shift+ArrowUp Shift+ArrowDown Shift+ArrowLeft Shift+ArrowRight Enter Space F2 Escape Control+C Control+V Delete Control+D Control+R"
          : "ArrowUp ArrowDown ArrowLeft ArrowRight Enter Space F2"
      }
      title={cellLeaveTitle(cell.leaveState, Boolean(firstShift)) ?? availabilityTitle}
      data-gridrow={rowIndex}
      data-gridcol={dayIndex}
      data-rowkey={rowKey}
      onFocus={() => {
        onFocus(rowIndex, dayIndex);
        selection.onCellFocus(cellKey);
      }}
      onMouseDown={(event) => {
        selection.onCellMouseDown(event, cellKey);
        // A shift pill prevents its own mousedown default so the button cannot
        // steal focus — but preventing the default only stops focus moving, it
        // does not hand it anywhere, so clicking a shift would leave focus
        // outside the grid entirely and the next Delete or fill shortcut would
        // reach nothing. The owning cell claims focus explicitly instead.
        if (!selection.enabled) return;
        if (event.target instanceof HTMLInputElement) return;
        interaction.cellRef.current?.focus();
      }}
      onDoubleClick={interaction.startEditing}
      onClick={(event) => {
        if (event.shiftKey) return;
        // With rectangular selection on, a single click only selects. Opening an
        // editor here would fight the manager for focus every time they picked a
        // cell; double-click, Enter and F2 are the ways in.
        if (selection.enabled) return;
        if (!firstShift) interaction.startEditing();
      }}
      onKeyDown={interaction.handleKeyDown}
      className={`relative border-b border-l px-2 py-2 select-none outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-within:ring-1 focus-within:ring-brand/30 ${
        day?.isToday ? todayClass : defaultClass
      } ${leaveClass} ${availabilityClass} ${selectionClass}`}
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
          initial={interaction.initialValue}
          contextLabel={cellLabel}
          parseOptions={interaction.parseOptions}
          onCommit={interaction.handleCommit}
          onCancel={interaction.cancelEditing}
        />
      ) : (
        <ShiftCell
          shifts={cell.shifts}
          context={context}
          // Selecting a block must not pop a drawer per cell; on desktop the
          // pill's own click is stood down and Enter or the shift menu open it.
          suppressPillOpen={selection.enabled}
          menuHandlers={interaction.menuHandlers}
          openMenuShiftId={interaction.openMenuShiftId}
          onMenuOpenChange={interaction.handleMenuOpenChange}
          emptyAriaLabel={cellLabel + ": no shift"}
        />
      )}
    </div>
  );
}
