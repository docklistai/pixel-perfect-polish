import * as React from "react";
import { useRotaBulkOperations } from "./useRotaBulkOperations";
import { useRotaBulkKeyboard } from "./useRotaBulkKeyboard";
import type { RotaBulkRunners } from "./runRotaBulkPlan";
import type { RotaCellSelectionApi } from "../types";
import type { RotaGridSelection } from "../selection/useRotaGridSelection";
import type { RotaGridOpenRow, RotaGridStaffRow } from "../../../types";

/**
 * Everything the grid needs to offer bulk clear, paste and fill: the key
 * routing, the paste interception, and the preview dialog's props.
 *
 * Bulk shortcuts see each key first and hand back anything they do not claim, so
 * arrow movement and the Escape ladder behave exactly as they did before.
 */
export function useRotaGridBulk({
  selection,
  staffRows,
  openRow,
  dayLabels,
  workspaceRoles,
  runners,
  readOnly,
  weekIsEditable,
  onBlocked,
  announce,
  onGridKeyDown,
}: {
  selection: RotaGridSelection;
  staffRows: readonly RotaGridStaffRow[];
  openRow: RotaGridOpenRow;
  dayLabels: readonly string[];
  workspaceRoles?: readonly string[];
  runners: RotaBulkRunners;
  readOnly: boolean;
  weekIsEditable: boolean;
  onBlocked: () => void;
  announce: (message: string) => void;
  onGridKeyDown: RotaCellSelectionApi["onCellKeyDown"];
}) {
  const bulk = useRotaBulkOperations({
    selection,
    staffRows,
    openRow,
    dayLabels,
    workspaceRoles,
    runners,
    readOnly,
    weekIsEditable,
    onBlocked,
    announce,
  });

  const handleBulkKeyDown = useRotaBulkKeyboard({
    enabled: bulk.canOperate,
    onClear: bulk.requestClear,
    onFillDown: React.useCallback(() => bulk.requestFill("down"), [bulk]),
    onFillRight: React.useCallback(() => bulk.requestFill("right"), [bulk]),
  });

  const handleCellKeyDown = React.useCallback<RotaCellSelectionApi["onCellKeyDown"]>(
    (event, cell) => handleBulkKeyDown(event) || onGridKeyDown(event, cell),
    [handleBulkKeyDown, onGridKeyDown],
  );

  const handlePaste = React.useCallback(
    (event: React.ClipboardEvent<HTMLDivElement>) => {
      if (!bulk.canOperate) return;
      // The inline editor keeps its own paste.
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }
      event.preventDefault();
      bulk.requestPaste(event.clipboardData.getData("text/plain"));
    },
    [bulk],
  );

  return { dialog: bulk.dialog, handleCellKeyDown, handlePaste };
}
