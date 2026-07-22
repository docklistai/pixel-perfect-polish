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
import { useRotaGridNavigation } from "./grid/useRotaGridNavigation";
import type {
  RotaGridOpenRow,
  RotaGridStaffRow,
  DraftShift,
  DraftShiftInput,
  ShiftId,
} from "../types";

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
  readOnly,
  canCopyShiftAssignment,
  onReadOnlyAttempt,
  onShiftOpen,
  onShiftDuplicate,
  onShiftRemove,
  onShiftClear,
  onShiftMarkOpen,
  onShiftSetDept,
  onShiftSetDepartment,
  departments,
  configuredRoles,
  onShiftSetColour,
  onShiftResetColour,
  onShiftAdd,
  onShiftUpdate,
  serverBacked = false,
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
  readOnly: boolean;
  serverBacked?: boolean;
  /** Roles the workspace has configured, beyond those held by staff. */
  configuredRoles?: readonly string[];
  onReadOnlyAttempt: () => void;
  onShiftAdd?: ShiftActionHandlers["onShiftAdd"];
  onShiftUpdate?: ShiftActionHandlers["onShiftUpdate"];
} & ShiftActionHandlers) {
  const renderedBodyRows = staffRows.length > 0 ? staffRows.length : 1;
  const openRowIndex = staffRows.length > 0 ? staffRows.length : 1;
  const gridNavigation = useRotaGridNavigation({
    maxRowIndex: openRowIndex,
    dayCount: days.length,
  });
  // The workspace's genuine configured roles: the roles people actually hold,
  // plus any role the workspace has configured elsewhere.
  //
  // Roles seen only on shifts are deliberately excluded. A temporary label such
  // as Training or Cover, typed onto one shift, must not become "configured"
  // just because it now appears on the grid — otherwise re-editing it would
  // stop warning, and the label would look like real workspace configuration.
  const workspaceRoles = React.useMemo(() => {
    const roles = new Set<string>();
    for (const row of staffRows) {
      if (row.staff.role) roles.add(row.staff.role);
    }
    for (const role of configuredRoles ?? []) roles.add(role);
    return [...roles];
  }, [staffRows, configuredRoles]);

  const handlers = React.useMemo<ShiftActionHandlers>(
    () => ({
      readOnly,
      serverBacked,
      workspaceRoles,
      canCopyShiftAssignment,
      onReadOnlyAttempt,
      onShiftOpen,
      onShiftDuplicate,
      onShiftRemove,
      onShiftClear,
      onShiftMarkOpen,
      onShiftSetDept,
      onShiftSetDepartment,
      departments,
      onShiftSetColour,
      onShiftResetColour,
      onShiftAdd,
      onShiftUpdate,
    }),
    [
      onShiftDuplicate,
      onShiftMarkOpen,
      onShiftOpen,
      onReadOnlyAttempt,
      onShiftRemove,
      onShiftClear,
      onShiftSetDept,
      onShiftSetDepartment,
      departments,
      onShiftSetColour,
      onShiftResetColour,
      onShiftAdd,
      onShiftUpdate,
      readOnly,
      serverBacked,
      workspaceRoles,
      canCopyShiftAssignment,
    ],
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
        days off. Tab enters at staff search. Press Arrow Down to enter the rota cells, then use the
        arrow keys to move. Press Enter or Space to open or add a shift.
      </p>

      <div className="w-full max-w-full min-w-0">
        <div className="max-h-[70dvh] w-full max-w-full min-w-0 overflow-auto overscroll-contain">
          <div
            ref={gridNavigation.gridRef}
            data-rota-grid
            role="grid"
            aria-labelledby={scheduleTitleId}
            aria-describedby={scheduleDescId}
            aria-colcount={days.length + 1}
            aria-rowcount={renderedBodyRows + 3}
            onBlurCapture={gridNavigation.handleBlur}
            className="grid min-w-[720px] w-max grid-cols-[160px_repeat(7,80px)] md:min-w-[1080px] md:grid-cols-[240px_repeat(7,120px)] xl:w-full xl:grid-cols-[240px_repeat(7,minmax(120px,1fr))]"
          >
            <RotaGridHeader
              days={days}
              staffCount={staffCount}
              visibleStaffCount={visibleStaffCount}
              staffSearch={staffSearch}
              onStaffSearchChange={onStaffSearchChange}
              searchIsTabStop={gridNavigation.searchIsTabStop}
              onSearchFocus={gridNavigation.resetToSearch}
              onEnterGrid={gridNavigation.focusFirstCell}
              descriptionId={scheduleDescId}
            />

            {staffRows.length > 0 ? (
              staffRows.map((row, rowIndex) => (
                <RotaStaffRow
                  key={row.staff.id}
                  row={row}
                  days={days}
                  handlers={handlers}
                  rowIndex={rowIndex}
                  activeRowIndex={gridNavigation.activeRowIndex}
                  activeDayIndex={gridNavigation.activeDayIndex}
                  onCellFocus={gridNavigation.setActiveCell}
                />
              ))
            ) : (
              <RotaEmptyState
                staffCount={staffCount}
                staffSearch={staffSearch}
                hasActiveFilters={hasActiveFilters}
                onClearFilters={onClearFilters}
                isTabStop={
                  gridNavigation.activeRowIndex === 0 && gridNavigation.activeDayIndex === 0
                }
                onCellFocus={() => gridNavigation.setActiveCell(0, 0)}
              />
            )}

            <RotaOpenShiftsRow
              openRow={openRow}
              days={days}
              totalOpenShifts={totalOpenShifts}
              handlers={handlers}
              rowIndex={openRowIndex}
              ariaRowIndex={staffRows.length > 0 ? staffRows.length + 2 : 3}
              activeRowIndex={gridNavigation.activeRowIndex}
              activeDayIndex={gridNavigation.activeDayIndex}
              onCellFocus={gridNavigation.setActiveCell}
            />
            <RotaGridFooter days={days} ariaRowIndex={renderedBodyRows + 3} />
          </div>
        </div>
      </div>
    </section>
  );
}
