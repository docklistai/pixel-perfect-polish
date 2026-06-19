import * as React from "react";
import { ShiftCell } from "../ShiftCell";
import { InlineCellEditor } from "./InlineCellEditor";
import { parseTimeRange } from "./inlineCellParsing";
import type { RotaGridDay, ShiftActionHandlers, ShiftMenuHandlers } from "./types";
import type {
  RotaGridCell as RotaGridCellData,
  DraftShift,
  RotaDayIndex,
  ShiftId,
} from "../../types";
import { toast } from "sonner";

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
  const leaveClass = cell.hasLeave && !openRow ? "bg-muted/20" : "";

  const firstShift = cell.shifts[0];
  const initialValue = firstShift
    ? firstShift.status === "open"
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
      if (val === "off") {
        for (const shift of cell.shifts) await handlers.onShiftClear(shift.id);
      } else if (val === "open") {
        if (cell.shifts.length > 0) {
          for (const shift of cell.shifts) await handlers.onShiftMarkOpen(shift.id);
        } else {
          await handlers.onShiftAdd?.({
            dayIndex: dayIndex as RotaDayIndex,
            staffId: null,
            role: staffRole || "FOH",
            start: "09:00",
            end: "17:00",
            status: "open",
            tone: "open",
          });
          if (!handlers.serverBacked) toast.success("Open shift created");
        }
      } else {
        const parsed = parseTimeRange(val);
        if (!parsed) {
          toast.error("Invalid format", {
            description: "Use e.g. 09:00 - 17:00, 9am - 5pm, or 9-5",
          });
          return;
        }
        if (cell.shifts.length > 0) {
          for (const shift of cell.shifts) {
            await handlers.onShiftUpdate?.(shift.id, {
              start: parsed.start,
              end: parsed.end,
              status: staffId ? "scheduled" : "open",
              tone: staffId ? "info" : "open",
              edited: true,
            });
          }
          if (!handlers.serverBacked)
            toast.success("Shift updated", { description: "Saved to draft" });
        } else {
          await handlers.onShiftAdd?.({
            dayIndex: dayIndex as RotaDayIndex,
            staffId: staffId || null,
            role: staffRole || "FOH",
            start: parsed.start,
            end: parsed.end,
            status: staffId ? "scheduled" : "open",
            tone: staffId ? "info" : "open",
          });
          if (!handlers.serverBacked) toast.success("Shift created");
        }
      }
    } catch {
      // The server mutation hook owns the failure toast; keep the cell from
      // reporting a successful edit when persistence fails.
    }
  };

  const menuHandlers = React.useMemo<ShiftMenuHandlers>(
    () => ({
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
      : cell.hasLeave
        ? `${emptyAriaLabel} — Approved leave, press Enter to add a shift, F2 to edit`
        : `${emptyAriaLabel} — press Enter to add a shift, F2 to edit`;

  return (
    <div
      tabIndex={0}
      role="gridcell"
      aria-label={cellAriaLabel}
      title={cell.hasLeave && !firstShift ? "Approved leave" : undefined}
      data-gridrow={rowIndex}
      data-gridcol={dayIndex}
      onDoubleClick={startEditing}
      onKeyDown={handleKeyDown}
      className={`relative border-b border-l px-2 py-2 select-none outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-within:ring-1 focus-within:ring-brand/30 ${
        day?.isToday ? todayClass : defaultClass
      } ${leaveClass}`}
    >
      {cell.hasLeave && !firstShift && !isEditing && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-[10px] font-semibold tracking-wider text-muted-foreground/40 uppercase">
            Leave
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
