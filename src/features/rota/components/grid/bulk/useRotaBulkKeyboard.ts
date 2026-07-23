import * as React from "react";

/**
 * Bulk shortcuts, routed before the grid's own arrow handling.
 *
 * Ctrl/Cmd+R is browser reload and Ctrl/Cmd+D is bookmark, so both are only
 * taken when a rota cell has focus and a rectangle is actually selected. Outside
 * those conditions the event is left entirely alone and the browser does what
 * the manager expected.
 */
export function useRotaBulkKeyboard({
  enabled,
  onClear,
  onFillDown,
  onFillRight,
}: {
  /** Desktop selection is on and a rectangle exists. */
  enabled: boolean;
  onClear: () => void;
  onFillDown: () => void;
  onFillRight: () => void;
}) {
  return React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>): boolean => {
      if (!enabled) return false;
      // The inline editor owns its own keys, including Backspace.
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return false;
      }

      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        onClear();
        return true;
      }

      if (!(event.metaKey || event.ctrlKey) || event.altKey) return false;
      const key = event.key.toLowerCase();
      if (key === "d") {
        event.preventDefault();
        onFillDown();
        return true;
      }
      if (key === "r") {
        event.preventDefault();
        onFillRight();
        return true;
      }
      return false;
    },
    [enabled, onClear, onFillDown, onFillRight],
  );
}
