import * as React from "react";
import {
  RotaEmptyState,
  RotaGridFooter,
  RotaGridHeader,
  RotaOpenShiftsRow,
  RotaStaffRow,
  type RotaGridDay,
  type ShiftActionHandlers,
} from "./grid";
import type { RotaGridOpenRow, RotaGridStaffRow } from "../types";

export function RotaGrid({
  days,
  staffRows,
  openRow,
  staffCount,
  visibleStaffCount,
  weekLabel,
  staffSearch,
  hasActiveFilters,
  scheduleTitleId,
  scheduleDescId,
  onStaffSearchChange,
  onClearFilters,
  onShiftOpen,
  onShiftDuplicate,
  onShiftRemove,
  onShiftMarkOpen,
}: {
  days: RotaGridDay[];
  staffRows: RotaGridStaffRow[];
  openRow: RotaGridOpenRow;
  staffCount: number;
  visibleStaffCount: number;
  weekLabel: string;
  staffSearch: string;
  hasActiveFilters: boolean;
  scheduleTitleId: string;
  scheduleDescId: string;
  onStaffSearchChange: (value: string) => void;
  onClearFilters: () => void;
} & ShiftActionHandlers) {
  const handlers = React.useMemo<ShiftActionHandlers>(
    () => ({
      onShiftOpen,
      onShiftDuplicate,
      onShiftRemove,
      onShiftMarkOpen,
    }),
    [onShiftDuplicate, onShiftMarkOpen, onShiftOpen, onShiftRemove],
  );
  const totalOpenShifts = React.useMemo(
    () => openRow.cells.reduce((acc, cell) => acc + cell.shifts.length, 0),
    [openRow.cells],
  );
  const visuallyHidden = React.useMemo(
    () =>
      ({
        clip: "rect(0, 0, 0, 0)",
        clipPath: "inset(50%)",
      }) as const,
    [],
  );

  return (
    <section
      role="region"
      aria-labelledby={scheduleTitleId}
      aria-describedby={scheduleDescId}
      className="w-full min-w-0"
    >
      <h2
        id={scheduleTitleId}
        className="absolute h-px w-px overflow-hidden whitespace-nowrap border-0 p-0 -m-px"
        style={visuallyHidden}
      >
        Weekly rota matrix
      </h2>
      <p
        id={scheduleDescId}
        className="absolute h-px w-px overflow-hidden whitespace-nowrap border-0 p-0 -m-px"
        style={visuallyHidden}
      >
        Interactive schedule grid for the week of {weekLabel}. Each shift tile includes the staff
        member, day, role, and status so screen readers can understand open shifts, conflicts, and
        days off.
      </p>

      <div className="w-full max-w-full min-w-0 overflow-hidden [contain:layout_paint]">
        <div className="w-full max-w-full min-w-0 overflow-x-auto overflow-y-hidden overscroll-x-contain">
          <div className="grid min-w-[720px] w-max grid-cols-[160px_repeat(7,80px)] md:min-w-[1080px] md:grid-cols-[240px_repeat(7,120px)] xl:w-full xl:grid-cols-[240px_repeat(7,minmax(120px,1fr))]">
            <RotaGridHeader
              days={days}
              staffCount={staffCount}
              visibleStaffCount={visibleStaffCount}
              staffSearch={staffSearch}
              onStaffSearchChange={onStaffSearchChange}
            />

            {staffRows.length > 0 ? (
              staffRows.map((row) => (
                <RotaStaffRow key={row.staff.id} row={row} days={days} handlers={handlers} />
              ))
            ) : (
              <RotaEmptyState
                staffSearch={staffSearch}
                hasActiveFilters={hasActiveFilters}
                onClearFilters={onClearFilters}
              />
            )}

            <RotaOpenShiftsRow
              openRow={openRow}
              days={days}
              totalOpenShifts={totalOpenShifts}
              handlers={handlers}
            />
            <RotaGridFooter days={days} />
          </div>
        </div>
      </div>
    </section>
  );
}
