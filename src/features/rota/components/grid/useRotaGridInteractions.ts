import * as React from "react";
import { useRotaGridNavigation } from "./useRotaGridNavigation";
import { useRotaGridKeyboard } from "./useRotaGridKeyboard";
import { useRotaGridSelection } from "./selection/useRotaGridSelection";
import { useRotaCellSelectionApi } from "./selection/useRotaCellSelectionApi";
import { useRotaSelectionAnnouncement } from "./selection/useRotaSelectionAnnouncement";
import { useSelectionCapableViewport } from "./selection/useSelectionCapableViewport";
import { useRotaGridCopy } from "./clipboard/useRotaGridCopy";
import { useRotaGridBulk } from "./bulk/useRotaGridBulk";
import { useRotaShiftMove } from "./move/useRotaShiftMove";
import type { RotaBulkRunners } from "./bulk/runRotaBulkPlan";
import type { RotaCellSelectionApi, ShiftActionHandlers } from "./types";
import type { RotaGridOpenRow, RotaGridStaffRow, StaffMember } from "../../types";

/**
 * The grid's interaction composition: roving focus, rectangular selection, the
 * polite live region, clipboard copy/paste, the bulk operations built on top of
 * them, and moving a single shift.
 *
 * Extracted from `RotaGrid` unchanged in meaning. The order below is the whole
 * reason this is one hook rather than several calls in the component body, and
 * it is load-bearing in both directions: bulk key routing has to see a key
 * before selection does, an armed move has to see it before either — Escape
 * cancels the move rather than collapsing a rectangle, Enter places the shift
 * rather than opening the drawer — and the cell-facing selection API has to
 * carry the fully composed handler rather than the raw one. Spread across a
 * component body, that ordering invited reshuffling by accident.
 */
export function useRotaGridInteractions({
  staffRows,
  openRow,
  dayCount,
  openRowIndex,
  selectionResetKey,
  configuredRoles,
  bulkRunners,
  readOnly,
  weekIsEditable,
  mutationPending,
  assignableStaff,
  onReadOnlyAttempt,
  onShiftUpdate,
  dayLabels,
}: {
  staffRows: readonly RotaGridStaffRow[];
  openRow: RotaGridOpenRow;
  dayCount: number;
  /** Row index of the open-shifts row: the last selectable row. */
  openRowIndex: number;
  selectionResetKey: string;
  configuredRoles?: readonly string[];
  bulkRunners: RotaBulkRunners;
  readOnly: boolean;
  weekIsEditable: boolean;
  /** A rota write is in flight, so no move may be started or committed. */
  mutationPending: boolean;
  /** Active staff a shift may be assigned to. Not every rendered row. */
  assignableStaff: readonly StaffMember[];
  onReadOnlyAttempt: () => void;
  onShiftUpdate?: ShiftActionHandlers["onShiftUpdate"];
  dayLabels: readonly string[];
}) {
  const gridNavigation = useRotaGridNavigation({
    maxRowIndex: openRowIndex,
    dayCount,
  });

  const selectionCapable = useSelectionCapableViewport();
  const selection = useRotaGridSelection({
    enabled: selectionCapable,
    staffRows,
    openRow,
    dayCount,
    resetKey: selectionResetKey,
  });
  const handleGridKeyDown = useRotaGridKeyboard({
    selection,
    dayCount,
    hasStaffRows: staffRows.length > 0,
  });
  const announcement = useRotaSelectionAnnouncement(selection.summary);
  const handleCopy = useRotaGridCopy({
    enabled: selection.enabled,
    summary: selection.summary,
    announce: announcement.announce,
  });

  const { move, handleCellKeyDown: handleMoveKeyDown } = useRotaShiftMove({
    staffRows,
    openRow,
    dayLabels,
    assignableStaff,
    readOnly,
    weekIsEditable,
    mutationPending,
    // Pointer drag answers to the same capability gate as rectangular selection:
    // a coarse pointer on a grid that is already scrolling sideways cannot drag
    // honestly, so touch keeps the menu path instead.
    pointerCapable: selectionCapable,
    gridRef: gridNavigation.gridRef,
    announce: announcement.announce,
    onShiftUpdate,
    resetKey: selectionResetKey,
  });

  const bulk = useRotaGridBulk({
    selection,
    staffRows,
    openRow,
    dayLabels,
    workspaceRoles: configuredRoles,
    runners: bulkRunners,
    readOnly,
    weekIsEditable,
    onBlocked: onReadOnlyAttempt,
    announce: announcement.announce,
    onGridKeyDown: handleGridKeyDown,
  });

  const handleCellKeyDown = React.useCallback<RotaCellSelectionApi["onCellKeyDown"]>(
    (event, cell) => handleMoveKeyDown(event, cell) || bulk.handleCellKeyDown(event, cell),
    [bulk, handleMoveKeyDown],
  );

  const cellSelection = useRotaCellSelectionApi(selection, handleCellKeyDown);

  return {
    gridNavigation,
    selectionCapable,
    selection,
    cellSelection,
    announcement,
    move,
    handleCopy,
    handlePaste: bulk.handlePaste,
    bulkDialog: bulk.dialog,
  };
}
