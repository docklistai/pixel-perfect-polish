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
import { RotaGridDescription } from "./grid/RotaGridDescription";
import { useRotaGridNavigation } from "./grid/useRotaGridNavigation";
import { useRotaGridKeyboard } from "./grid/useRotaGridKeyboard";
import { countOpenShifts } from "./grid/rotaGridMetrics";
import { useShiftActionHandlers } from "./grid/useShiftActionHandlers";
import { useRotaGridSelection } from "./grid/selection/useRotaGridSelection";
import { useRotaCellSelectionApi } from "./grid/selection/useRotaCellSelectionApi";
import { useRotaSelectionAnnouncement } from "./grid/selection/useRotaSelectionAnnouncement";
import { useSelectionCapableViewport } from "./grid/selection/useSelectionCapableViewport";
import { useRotaGridCopy } from "./grid/clipboard/useRotaGridCopy";
import { useRotaGridBulk } from "./grid/bulk/useRotaGridBulk";
import { RotaBulkPreviewDialog } from "./grid/bulk/RotaBulkPreviewDialog";
import type { RotaBulkRunners } from "./grid/bulk/runRotaBulkPlan";
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
  selectionResetKey,
  bulkRunners,
  weekIsEditable = true,
  onStaffSearchChange,
  onClearFilters,
  readOnly,
  duplicateBlockedReason,
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
  onRecordAbsence,
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
  /** Week, source and location identity — a change invalidates any selection. */
  selectionResetKey: string;
  /** Toast-free sequential writes plus one end-of-run refetch, for bulk changes. */
  bulkRunners: RotaBulkRunners;
  /** False for archived weeks, which refuse every write server-side anyway. */
  weekIsEditable?: boolean;
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

  const selectionCapable = useSelectionCapableViewport();
  const selection = useRotaGridSelection({
    enabled: selectionCapable,
    staffRows,
    openRow,
    dayCount: days.length,
    resetKey: selectionResetKey,
  });
  const handleGridKeyDown = useRotaGridKeyboard({
    selection,
    dayCount: days.length,
    hasStaffRows: staffRows.length > 0,
  });
  const announcement = useRotaSelectionAnnouncement(selection.summary);
  const handleCopy = useRotaGridCopy({
    enabled: selection.enabled,
    summary: selection.summary,
    announce: announcement.announce,
  });

  const bulk = useRotaGridBulk({
    selection,
    staffRows,
    openRow,
    dayLabels: React.useMemo(() => days.map((day) => day.d), [days]),
    workspaceRoles: configuredRoles,
    runners: bulkRunners,
    readOnly,
    weekIsEditable,
    onBlocked: onReadOnlyAttempt,
    announce: announcement.announce,
    onGridKeyDown: handleGridKeyDown,
  });

  const cellSelection = useRotaCellSelectionApi(selection, bulk.handleCellKeyDown);

  const handlers = useShiftActionHandlers({
    staffRows,
    configuredRoles,
    readOnly,
    serverBacked,
    departments,
    duplicateBlockedReason,
    onReadOnlyAttempt,
    onShiftOpen,
    onShiftDuplicate,
    onShiftRemove,
    onShiftClear,
    onShiftMarkOpen,
    onShiftSetDept,
    onShiftSetDepartment,
    onShiftSetColour,
    onShiftResetColour,
    onShiftAdd,
    onShiftUpdate,
    onRecordAbsence,
  });
  const totalOpenShifts = React.useMemo(() => countOpenShifts(openRow.cells), [openRow.cells]);

  return (
    <section
      role="region"
      aria-labelledby={scheduleTitleId}
      aria-describedby={scheduleDescId}
      className="w-full min-w-0"
    >
      <RotaGridDescription
        titleId={scheduleTitleId}
        descriptionId={scheduleDescId}
        weekLabel={weekLabel}
        selectionEnabled={selection.enabled}
      />
      <div aria-live="polite" role="status" className="sr-only">
        {announcement.message}
      </div>

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
            aria-multiselectable={selection.enabled ? true : undefined}
            onBlurCapture={gridNavigation.handleBlur}
            onCopy={handleCopy}
            onPaste={bulk.handlePaste}
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
                  selection={cellSelection}
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
              selection={cellSelection}
              rowIndex={openRowIndex}
              ariaRowIndex={staffRows.length > 0 ? staffRows.length + 2 : 3}
              activeRowIndex={gridNavigation.activeRowIndex}
              activeDayIndex={gridNavigation.activeDayIndex}
              onCellFocus={gridNavigation.setActiveCell}
            />
            <RotaGridFooter
              days={days}
              ariaRowIndex={renderedBodyRows + 3}
              selectionEnabled={selection.enabled}
            />
          </div>
        </div>
      </div>

      <RotaBulkPreviewDialog {...bulk.dialog} />
    </section>
  );
}
