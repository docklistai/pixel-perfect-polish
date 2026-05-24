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
      <div className="flex items-center gap-3 border-b border-border px-4 py-3.5">
        <img
          src={`https://i.pravatar.cc/64?img=${row.staff.img}`}
          alt=""
          className="h-9 w-9 rounded-full object-cover"
        />
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">{row.staff.name}</div>
          <div className="text-[11px] text-muted-foreground">
            {row.staff.role} · {row.staff.hrs}
          </div>
          <div className="text-[10px] text-muted-foreground">Contracted</div>
        </div>
      </div>
      {row.cells.map((cell, dayIndex) => (
        <RotaGridCell
          key={`${row.staff.id}-${dayIndex}`}
          cell={cell}
          day={days[dayIndex]}
          context="staff"
          handlers={handlers}
          emptyAriaLabel={`${row.staff.name}, ${days[dayIndex]?.d ?? ""}: no shift`}
        />
      ))}
    </React.Fragment>
  );
}
