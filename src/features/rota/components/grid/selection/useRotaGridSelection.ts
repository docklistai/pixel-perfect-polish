import * as React from "react";
import { buildRotaSelectionSummary, type RotaSelectionSummary } from "./rotaSelectionSummary";
import {
  buildRotaRowKeys,
  collapseSelection,
  extendSelectionTo,
  normaliseSelection,
  rectContains,
  rectIsSingleCell,
  resolveSelectionRect,
  selectSingleCell,
  type RotaCellKey,
  type RotaRowKey,
  type RotaSelection,
} from "./rotaSelectionModel";
import type { RotaGridOpenRow, RotaGridStaffRow } from "../../../types";

export type { RotaSelectionSummary } from "./rotaSelectionSummary";

/**
 * Rectangular selection state for the rota grid.
 *
 * The selection is two stable cell keys; every index in this hook is derived
 * from the currently visible rows, never stored. That is what keeps filtering
 * honest: a row that disappears takes its key with it, and any selection that
 * depended on it is dropped rather than silently re-pointed at whichever row
 * now occupies that position.
 */
export function useRotaGridSelection({
  enabled,
  staffRows,
  openRow,
  dayCount,
  resetKey,
}: {
  enabled: boolean;
  staffRows: readonly RotaGridStaffRow[];
  openRow: RotaGridOpenRow;
  dayCount: number;
  /** Week, data source and location identity. A change invalidates selection. */
  resetKey: string;
}) {
  const [selection, setSelection] = React.useState<RotaSelection | null>(null);

  const rowKeys = React.useMemo(() => buildRotaRowKeys(staffRows), [staffRows]);
  const rowIndexByKey = React.useMemo(
    () => new Map<RotaRowKey, number>(rowKeys.map((key, index) => [key, index])),
    [rowKeys],
  );
  const rowCells = React.useMemo(
    () => [...staffRows.map((row) => row.cells), openRow.cells],
    [staffRows, openRow.cells],
  );

  // A different week, location or data source invalidates every stored key.
  React.useEffect(() => {
    setSelection(null);
  }, [resetKey]);

  // Rectangular selection is desktop-only; leaving the boundary drops it so no
  // invisible state survives into the mobile surface.
  React.useEffect(() => {
    if (!enabled) setSelection(null);
  }, [enabled]);

  // Filtering, searching or a roster change can remove an endpoint. Dropping the
  // selection is the only outcome that cannot leave a hidden selected cell.
  const rowKeySignature = rowKeys.join("|");
  React.useEffect(() => {
    setSelection((current) => normaliseSelection(current, rowKeys, dayCount));
    // rowKeys is rebuilt on every render of a new staffRows array; the signature
    // is what actually decides whether the visible identities changed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowKeySignature, dayCount]);

  const rect = React.useMemo(
    () => (enabled ? resolveSelectionRect(selection, rowKeys, dayCount) : null),
    [enabled, selection, rowKeys, dayCount],
  );

  const summary = React.useMemo<RotaSelectionSummary | null>(
    () => buildRotaSelectionSummary(rect, rowCells, rowKeys.length),
    [rect, rowCells, rowKeys.length],
  );

  const isSelected = React.useCallback(
    (rowKey: RotaRowKey, day: number) => {
      if (!rect) return false;
      const rowIndex = rowIndexByKey.get(rowKey);
      return rowIndex === undefined ? false : rectContains(rect, rowIndex, day);
    },
    [rect, rowIndexByKey],
  );

  const isAnchor = React.useCallback(
    (rowKey: RotaRowKey, day: number) =>
      Boolean(
        enabled && selection && selection.anchor.row === rowKey && selection.anchor.day === day,
      ),
    [enabled, selection],
  );

  const selectCell = React.useCallback(
    (cell: RotaCellKey) => {
      if (enabled) setSelection(selectSingleCell(cell));
    },
    [enabled],
  );

  const extendTo = React.useCallback(
    (cell: RotaCellKey) => {
      if (enabled) setSelection((current) => extendSelectionTo(current, cell));
    },
    [enabled],
  );

  /** Entering the grid seeds a collapsed selection without disturbing a range. */
  const ensureFocused = React.useCallback(
    (cell: RotaCellKey) => {
      if (enabled) setSelection((current) => current ?? selectSingleCell(cell));
    },
    [enabled],
  );

  const collapse = React.useCallback(() => setSelection(collapseSelection), []);
  const clear = React.useCallback(() => setSelection(null), []);

  return {
    enabled,
    selection,
    rect,
    summary,
    rowKeys,
    isCollapsed: rectIsSingleCell(rect),
    isSelected,
    isAnchor,
    selectCell,
    extendTo,
    ensureFocused,
    collapse,
    clear,
  };
}

export type RotaGridSelection = ReturnType<typeof useRotaGridSelection>;
