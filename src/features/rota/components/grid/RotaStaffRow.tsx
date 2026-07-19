import { StaffMonogram } from "@/features/staff/components/StaffMonogram";
import { RotaGridCell } from "./RotaGridCell";
import type { RotaGridDay, ShiftActionHandlers } from "./types";
import type { RotaGridStaffRow as RotaGridStaffRowData } from "../../types";

export function RotaStaffRow({
  row,
  days,
  handlers,
  rowIndex,
  activeRowIndex,
  activeDayIndex,
  onCellFocus,
}: {
  row: RotaGridStaffRowData;
  days: RotaGridDay[];
  handlers: ShiftActionHandlers;
  rowIndex: number;
  activeRowIndex: number | null;
  activeDayIndex: number | null;
  onCellFocus: (rowIndex: number, dayIndex: number) => void;
}) {
  return (
    <div role="row" aria-rowindex={rowIndex + 2} className="contents">
      <div
        role="rowheader"
        aria-colindex={1}
        className="flex items-center gap-2.5 border-b border-border px-3 py-3 sticky left-0 z-10 bg-background"
      >
        <StaffMonogram name={row.staff.name} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium leading-tight">{row.staff.name}</div>
          <div className="truncate text-[11px] text-muted-foreground">{row.staff.role}</div>
        </div>
        <div className="shrink-0 text-right">
          <div className="font-mono text-sm font-semibold tabular-nums leading-tight">
            {row.staff.hrs}
          </div>
          <div className="text-[10px] text-muted-foreground">/ week</div>
        </div>
      </div>
      {row.cells.map((cell, dayIndex) => (
        <RotaGridCell
          key={`${row.staff.id}-${dayIndex}`}
          cell={cell}
          day={days[dayIndex]}
          context="staff"
          handlers={handlers}
          staffId={row.staff.id}
          staffRole={row.staff.role}
          dayIndex={dayIndex}
          rowIndex={rowIndex}
          cellLabel={row.staff.name + ", " + (days[dayIndex]?.d ?? "")}
          isTabStop={activeRowIndex === rowIndex && activeDayIndex === dayIndex}
          onFocus={onCellFocus}
        />
      ))}
    </div>
  );
}
