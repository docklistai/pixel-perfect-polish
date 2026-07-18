import * as React from "react";

export function useRotaGridNavigation({
  maxRowIndex,
  dayCount,
}: {
  maxRowIndex: number;
  dayCount: number;
}) {
  const gridRef = React.useRef<HTMLDivElement>(null);
  const [activeCell, setActiveCellState] = React.useState<{
    rowIndex: number;
    dayIndex: number;
  } | null>(null);

  React.useEffect(() => {
    setActiveCellState((current) =>
      current
        ? {
            rowIndex: Math.min(current.rowIndex, maxRowIndex),
            dayIndex: Math.min(current.dayIndex, Math.max(dayCount - 1, 0)),
          }
        : null,
    );
  }, [dayCount, maxRowIndex]);

  const focusFirstCell = React.useCallback(() => {
    const firstCell = gridRef.current?.querySelector<HTMLElement>(
      '[data-gridrow="0"][data-gridcol="0"]',
    );
    if (!firstCell) return;
    setActiveCellState({ rowIndex: 0, dayIndex: 0 });
    firstCell.focus();
  }, []);

  const handleBlur = React.useCallback((event: React.FocusEvent<HTMLDivElement>) => {
    if (
      !(event.relatedTarget instanceof Node) ||
      !event.currentTarget.contains(event.relatedTarget)
    ) {
      setActiveCellState(null);
    }
  }, []);

  const setActiveCell = React.useCallback((rowIndex: number, dayIndex: number) => {
    setActiveCellState({ rowIndex, dayIndex });
  }, []);
  const resetToSearch = React.useCallback(() => setActiveCellState(null), []);

  return {
    gridRef,
    activeRowIndex: activeCell?.rowIndex ?? null,
    activeDayIndex: activeCell?.dayIndex ?? null,
    searchIsTabStop: activeCell === null,
    focusFirstCell,
    handleBlur,
    setActiveCell,
    resetToSearch,
  };
}
