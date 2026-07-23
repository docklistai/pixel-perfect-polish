import type { DraftShift, RotaDayIndex, RotaGridCell } from "../../../types";
import type { RotaBulkTarget } from "./rotaBulkPlan";

let counter = 0;

export function makeShift(overrides: Partial<DraftShift> = {}): DraftShift {
  counter += 1;
  return {
    id: overrides.id ?? `shift-${counter}`,
    dayIndex: 0 as RotaDayIndex,
    staffId: "staff-1",
    role: "Bar",
    start: "09:00",
    end: "17:00",
    breakMinutes: 30,
    tone: "info",
    status: "scheduled",
    ...overrides,
  };
}

export function makeCell(
  shifts: DraftShift[] = [],
  extra: Partial<RotaGridCell> = {},
): RotaGridCell {
  return { shifts, ...extra };
}

export function makeTarget(overrides: Partial<RotaBulkTarget> = {}): RotaBulkTarget {
  const row = overrides.key?.row ?? "staff:a";
  const day = overrides.key?.day ?? 0;
  return {
    key: { row, day },
    label: overrides.label ?? `${row} day ${day}`,
    staffId: overrides.staffId ?? (row === "open" ? null : "staff-1"),
    staffRole: overrides.staffRole ?? (row === "open" ? undefined : "Bar"),
    openRow: overrides.openRow ?? row === "open",
    cell: overrides.cell ?? makeCell(),
  };
}

/** A rectangular grid of targets with stable row keys and day indexes. */
export function makeTargetGrid(
  cells: RotaGridCell[][],
  options: { rowKeys?: string[]; openRowIndexes?: number[] } = {},
): RotaBulkTarget[][] {
  return cells.map((row, rowIndex) => {
    const rowKey = options.rowKeys?.[rowIndex] ?? `staff:${rowIndex}`;
    const openRow = rowKey === "open" || (options.openRowIndexes?.includes(rowIndex) ?? false);
    return row.map((cell, day) =>
      makeTarget({
        key: { row: rowKey, day },
        label: `${rowKey} d${day}`,
        staffId: openRow ? null : `staff-${rowIndex}`,
        staffRole: openRow ? undefined : "Bar",
        openRow,
        cell,
      }),
    );
  });
}
