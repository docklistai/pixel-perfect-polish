import * as React from "react";
import { buildRotaBulkTargets } from "../selection/rotaSelectionTargets";
import { pastedBlockRect } from "./rotaPastePlan";
import { buildFreshPlanSignature, buildPlanSignature, type RotaBulkTarget } from "./rotaBulkPlan";
import type { DraftShift } from "../../../types";
import type { RotaSelectionRect } from "../selection/rotaSelectionModel";
import type { RotaGridSelection } from "../selection/useRotaGridSelection";
import type { RotaGridOpenRow, RotaGridStaffRow } from "../../../types";

/**
 * Turns selection rectangles into addressable targets, always against the
 * week as it currently stands.
 *
 * A plan is built from one rectangle and then revalidated against another read
 * of that same rectangle moments later, so the geometry has to be re-derivable
 * on demand rather than captured once. Capturing it would make drift detection
 * compare a plan against the very snapshot it was built from, which would
 * always agree and never catch anything.
 */
export function useRotaBulkTargets({
  selection,
  staffRows,
  openRow,
  dayLabels,
}: {
  selection: RotaGridSelection;
  staffRows: readonly RotaGridStaffRow[];
  openRow: RotaGridOpenRow;
  dayLabels: readonly string[];
}) {
  const latest = React.useRef({ rowKeys: selection.rowKeys, staffRows, openRow, dayLabels });
  latest.current = { rowKeys: selection.rowKeys, staffRows, openRow, dayLabels };

  const forRect = React.useCallback((rect: RotaSelectionRect | null): RotaBulkTarget[][] => {
    const current = latest.current;
    return buildRotaBulkTargets({
      rect,
      rowKeys: current.rowKeys,
      staffRows: current.staffRows,
      openRow: current.openRow,
      dayLabels: current.dayLabels,
    });
  }, []);

  const rows = React.useMemo(
    () =>
      buildRotaBulkTargets({
        rect: selection.rect,
        rowKeys: selection.rowKeys,
        staffRows,
        openRow,
        dayLabels,
      }),
    [dayLabels, openRow, selection.rect, selection.rowKeys, staffRows],
  );

  const rectForPastedBlock = React.useCallback(
    (blockRows: number, blockCols: number): RotaSelectionRect | null =>
      pastedBlockRect(selection.rect, blockRows, blockCols),
    [selection.rect],
  );

  const signatureFor = React.useCallback(
    (rect: RotaSelectionRect | null) => buildPlanSignature(forRect(rect).flat()),
    [forRect],
  );

  const signatureForFresh = React.useCallback(
    (rect: RotaSelectionRect | null, shifts: readonly DraftShift[]) =>
      buildFreshPlanSignature(forRect(rect).flat(), shifts),
    [forRect],
  );

  return {
    rows,
    rect: selection.rect,
    forRect,
    rectForPastedBlock,
    signatureFor,
    signatureForFresh,
  };
}
