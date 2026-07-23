const VISUALLY_HIDDEN = {
  clip: "rect(0, 0, 0, 0)",
  clipPath: "inset(50%)",
} as const;

const HIDDEN_CLASS = "absolute h-px w-px overflow-hidden whitespace-nowrap border-0 p-0 -m-px";

/**
 * The grid's accessible name and description. Visually hidden, but it is the
 * only place a screen-reader user is told how the rota matrix is entered and
 * navigated, so it carries the full keyboard contract.
 */
export function RotaGridDescription({
  titleId,
  descriptionId,
  weekLabel,
  selectionEnabled,
}: {
  titleId: string;
  descriptionId: string;
  weekLabel: string;
  selectionEnabled: boolean;
}) {
  return (
    <>
      <h2 id={titleId} className={HIDDEN_CLASS} style={VISUALLY_HIDDEN}>
        Weekly rota matrix
      </h2>
      <p id={descriptionId} className={HIDDEN_CLASS} style={VISUALLY_HIDDEN}>
        Interactive schedule grid for the week of {weekLabel}. Each shift tile includes the staff
        member, day, role, and status so screen readers can understand open shifts, conflicts, and
        days off. Tab enters at staff search. Press Arrow Down to enter the rota cells, then use the
        arrow keys to move. Press Enter or Space to open or add a shift.
        {selectionEnabled
          ? " Hold Shift with the arrow keys, or Shift and click, to select a block of cells. " +
            "Press Control or Command with C to copy the selected block as tab separated text, " +
            "or with V to paste. Press Delete to clear the selected cells, Control or Command with D " +
            "to fill down, and with R to fill right. Every bulk change is previewed before anything is saved. " +
            "Press Escape to shrink the selection to the current cell, and Escape again to clear it."
          : ""}
      </p>
    </>
  );
}
