import { AlertTriangle } from "lucide-react";
import { RotaGridCell } from "./RotaGridCell";
import type { RotaGridDay, ShiftActionHandlers } from "./types";
import type { RotaGridOpenRow } from "../../types";

export function RotaOpenShiftsRow({
  openRow,
  days,
  totalOpenShifts,
  handlers,
  rowIndex,
  ariaRowIndex,
  activeRowIndex,
  activeDayIndex,
  onCellFocus,
}: {
  openRow: RotaGridOpenRow;
  days: RotaGridDay[];
  totalOpenShifts: number;
  handlers: ShiftActionHandlers;
  rowIndex: number;
  ariaRowIndex: number;
  activeRowIndex: number | null;
  activeDayIndex: number | null;
  onCellFocus: (rowIndex: number, dayIndex: number) => void;
}) {
  return (
    <div role="row" aria-rowindex={ariaRowIndex} className="contents">
      <div
        role="rowheader"
        aria-colindex={1}
        className="flex items-center gap-3 border-b border-border bg-background px-4 py-3.5 sticky left-0 z-10"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-warning-soft text-warning">
          <AlertTriangle className="h-4 w-4" aria-hidden />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-medium">Open shifts</div>
          <div className="text-[11px] text-muted-foreground">
            {totalOpenShifts === 0
              ? "All shifts assigned"
              : `${totalOpenShifts} unassigned this week`}
          </div>
          <div className="text-[10px] text-muted-foreground">Unassigned</div>
        </div>
      </div>
      {openRow.cells.map((cell, dayIndex) => (
        <RotaGridCell
          key={`open-${dayIndex}`}
          cell={cell}
          day={days[dayIndex]}
          context="open"
          handlers={handlers}
          openRow
          staffId={null}
          staffRole="FOH"
          dayIndex={dayIndex}
          rowIndex={rowIndex}
          cellLabel={"Open shifts, " + (days[dayIndex]?.d ?? "")}
          isTabStop={activeRowIndex === rowIndex && activeDayIndex === dayIndex}
          onFocus={onCellFocus}
        />
      ))}
    </div>
  );
}
