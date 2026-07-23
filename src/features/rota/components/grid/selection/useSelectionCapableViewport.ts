import * as React from "react";

/**
 * Rectangular selection is a desktop affordance. It needs a pointer that can
 * Shift-click precisely and enough width that the 7-day grid is not already
 * scrolling under the thumb, so both conditions are required — a wide tablet
 * with a coarse pointer stays on the single-cell surface.
 *
 * Starts false so the server-rendered markup matches the first client render;
 * the media query resolves immediately afterwards.
 */
const SELECTION_MEDIA_QUERY = "(min-width: 768px) and (pointer: fine)";

export function useSelectionCapableViewport(): boolean {
  const [capable, setCapable] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const query = window.matchMedia(SELECTION_MEDIA_QUERY);
    const update = () => setCapable(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return capable;
}
