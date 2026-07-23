import * as React from "react";
import { buildRotaSelectionAnnouncement } from "./rotaSelectionA11y";
import type { RotaSelectionSummary } from "./useRotaGridSelection";

/** Long enough that holding Shift+Arrow announces the result, not every step. */
const ANNOUNCE_DELAY_MS = 150;

/**
 * One polite live region for the grid. Range changes are debounced so a held
 * Shift+Arrow speaks its destination rather than every cell on the way; single
 * cells announce nothing here, because moving focus already reads the cell's own
 * accessible name.
 */
export function useRotaSelectionAnnouncement(summary: RotaSelectionSummary | null) {
  const [message, setMessage] = React.useState("");

  const text = summary
    ? buildRotaSelectionAnnouncement({
        staffRowCount: summary.staffRowCount,
        includesOpenRow: summary.includesOpenRow,
        dayCount: summary.dayCount,
        cellCount: summary.cellCount,
        shiftCount: summary.shiftCount,
      })
    : "";

  React.useEffect(() => {
    if (!text) {
      setMessage("");
      return;
    }
    const timer = window.setTimeout(() => setMessage(text), ANNOUNCE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [text]);

  /** Immediate announcement for a discrete action, such as a copy. */
  const announce = React.useCallback((value: string) => setMessage(value), []);

  return { message, announce };
}
