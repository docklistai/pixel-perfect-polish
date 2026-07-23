import * as React from "react";
import { serialiseRotaSelectionTsv } from "./rotaCellSerializer";
import { buildRotaCopyAnnouncement } from "../selection/rotaSelectionA11y";
import { findAmbiguousSlashCell } from "./rotaCopySafety";
import type { RotaSelectionSummary } from "../selection/useRotaGridSelection";

/**
 * Copies the selected rectangle as TSV.
 *
 * This rides the browser's own copy event rather than a Ctrl+C keybinding, so
 * the native gesture, the Edit menu and the clipboard permission model all keep
 * working, and nothing is written asynchronously behind the user's back.
 *
 * Copy is strictly read-only: it never touches the selection, the rota draft or
 * publication state.
 */
export function useRotaGridCopy({
  enabled,
  summary,
  announce,
}: {
  enabled: boolean;
  summary: RotaSelectionSummary | null;
  announce: (message: string) => void;
}) {
  return React.useCallback(
    (event: React.ClipboardEvent<HTMLDivElement>) => {
      if (!enabled || !summary || summary.cellCount === 0) return;
      // The inline editor owns its own copy, and a real text selection (a staff
      // name, say) must still copy the text the manager highlighted.
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)
        return;
      if ((window.getSelection()?.toString() ?? "").length > 0) return;

      const ambiguous = findAmbiguousSlashCell(summary.rows);
      if (ambiguous) {
        const index = ambiguous.row * (summary.rows[0]?.length ?? 0) + ambiguous.column;
        const selected = event.currentTarget.querySelectorAll<HTMLElement>(
          '[role="gridcell"][aria-selected="true"]',
        );
        const label =
          selected[index]?.getAttribute("aria-label") ??
          `row ${ambiguous.row + 1}, column ${ambiguous.column + 1}`;
        announce(`Copy blocked. ${label}: / is reserved for split shifts.`);
        return;
      }
      event.preventDefault();
      event.clipboardData.setData("text/plain", serialiseRotaSelectionTsv(summary.rows));
      announce(buildRotaCopyAnnouncement(summary.cellCount, summary.shiftCount));
    },
    [announce, enabled, summary],
  );
}
