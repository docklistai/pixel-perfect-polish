import * as React from "react";

/**
 * Closes a lightweight popover on an outside click or Escape.
 *
 * The dashboard's quick-actions and "more" menus had byte-identical effects for
 * this; they are one hook now. Behaviour is unchanged: listeners exist only while
 * the menu is open, both document listeners are removed together, and a click
 * inside `ref` is ignored.
 */
export function useDismissOnOutside(
  ref: React.RefObject<HTMLElement | null>,
  open: boolean,
  onDismiss: () => void,
): void {
  // Kept in a ref so an inline arrow from the caller does not re-subscribe on
  // every render.
  const dismissRef = React.useRef(onDismiss);
  React.useEffect(() => {
    dismissRef.current = onDismiss;
  }, [onDismiss]);

  React.useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) dismissRef.current();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismissRef.current();
    };
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, ref]);
}
