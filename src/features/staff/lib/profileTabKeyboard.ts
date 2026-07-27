/**
 * Keyboard movement for the staff profile tablist (WAI-ARIA tabs pattern).
 *
 * The tabs were reachable only by Tab-stopping through every one of them, and
 * arrow keys did nothing — so a keyboard user paid seven Tab presses to leave
 * the tab strip, and the roving-tabIndex contract screen readers announce was
 * not being honoured. Left/Right wrap at both ends; Home/End jump to the edges.
 */
export function nextProfileTabIndex(key: string, current: number, count: number): number | null {
  if (count <= 0) return null;
  switch (key) {
    case "ArrowLeft":
      return (current - 1 + count) % count;
    case "ArrowRight":
      return (current + 1) % count;
    case "Home":
      return 0;
    case "End":
      return count - 1;
    default:
      return null;
  }
}
