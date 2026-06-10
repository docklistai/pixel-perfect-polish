import * as React from "react";
import { RotaGridCell } from "./RotaGridCell";
import type { RotaGridDay, ShiftActionHandlers } from "./types";
import type { RotaGridStaffRow as RotaGridStaffRowData } from "../../types";

export function RotaStaffRow({
  row,
  days,
  handlers,
}: {
  row: RotaGridStaffRowData;
  days: RotaGridDay[];
  handlers: ShiftActionHandlers;
}) {
  return (
    <React.Fragment>
      <div className="flex items-center gap-2.5 border-b border-border px-3 py-3">
        <img
          src={`https://i.pravatar.cc/64?img=${row.staff.img}`}
          alt=""
          className="h-8 w-8 shrink-0 rounded-full object-cover"
        />
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
          emptyAriaLabel={`${row.staff.name}, ${days[dayIndex]?.d ?? ""}: no shift`}
        />
      ))}
    </React.Fragment>
  );
}
