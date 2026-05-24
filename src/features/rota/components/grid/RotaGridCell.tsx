import { ShiftCell } from "../ShiftCell";
import type { RotaGridDay, ShiftActionHandlers } from "./types";
import type { RotaGridCell as RotaGridCellData } from "../../types";

export function RotaGridCell({
  cell,
  day,
  context,
  emptyAriaLabel,
  openRow = false,
  handlers,
}: {
  cell: RotaGridCellData;
  day: RotaGridDay | undefined;
  context: "staff" | "open";
  emptyAriaLabel: string;
  openRow?: boolean;
  handlers: ShiftActionHandlers;
}) {
  const todayClass = openRow
    ? "border-brand/20 bg-warning-soft/20"
    : "border-brand/20 bg-brand-soft/10";
  const defaultClass = openRow ? "border-border bg-warning-soft/10" : "border-border";

  return (
    <div className={`border-b border-l px-2 py-2 ${day?.isToday ? todayClass : defaultClass}`}>
      <ShiftCell
        shifts={cell.shifts}
        context={context}
        onOpenShift={handlers.onShiftOpen}
        onDuplicateShift={handlers.onShiftDuplicate}
        onRemoveShift={handlers.onShiftRemove}
        onMarkOpenShift={handlers.onShiftMarkOpen}
        emptyAriaLabel={emptyAriaLabel}
      />
    </div>
  );
}
