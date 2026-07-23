import type { DraftShift, DraftShiftInput, RotaGridCell, ShiftId } from "../../../types";
import type { RotaCellKey } from "../selection/rotaSelectionModel";

export type RotaBulkKind = "clear" | "paste" | "fill-down" | "fill-right";

/** One selected cell, with everything a plan builder needs to reason about it. */
export type RotaBulkTarget = {
  key: RotaCellKey;
  /** "Amelia Stone, Mon 20" — the same wording the cell announces. */
  label: string;
  staffId: string | null;
  staffRole?: string;
  openRow: boolean;
  cell: RotaGridCell;
};

export type RotaBulkOp =
  | { kind: "create"; input: DraftShiftInput }
  | { kind: "update"; shiftId: ShiftId; patch: Partial<DraftShift> }
  | { kind: "remove"; shiftId: ShiftId };

export type RotaBulkCellPlan = {
  key: RotaCellKey;
  label: string;
  ops: RotaBulkOp[];
  /** Non-blocking things the manager should see before confirming. */
  warnings: string[];
};

/** A refusal that stops the whole operation, named to the exact cell. */
export type RotaBulkBlocker = { label: string; message: string };

export type RotaBulkCounts = {
  cells: number;
  created: number;
  updated: number;
  cleared: number;
  /** Shifts touched, which is not the cell count — a cell may hold several. */
  shifts: number;
};

export type RotaBulkPlan = {
  kind: RotaBulkKind;
  cells: RotaBulkCellPlan[];
  blockers: RotaBulkBlocker[];
  /** Plain statements about what the operation will do, e.g. department rules. */
  notes: string[];
  /**
   * Fingerprint of every shift this plan was built against. Re-derived from
   * freshly fetched data immediately before writing; a mismatch means someone
   * else changed the week and the plan is abandoned unapplied.
   */
  signature: string;
  counts: RotaBulkCounts;
};

export function countBulkPlan(cells: readonly RotaBulkCellPlan[]): RotaBulkCounts {
  let created = 0;
  let updated = 0;
  let cleared = 0;
  for (const cell of cells) {
    for (const op of cell.ops) {
      if (op.kind === "create") created += 1;
      else if (op.kind === "update") updated += 1;
      else cleared += 1;
    }
  }
  return {
    cells: cells.filter((cell) => cell.ops.length > 0).length,
    created,
    updated,
    cleared,
    shifts: created + updated + cleared,
  };
}

/**
 * Fingerprints the shifts a plan depends on. Ids alone are not enough — an
 * unchanged id whose times or assignee moved would make the plan write over
 * someone else's edit.
 */
export function buildPlanSignature(targets: readonly RotaBulkTarget[]): string {
  return targets
    .map((target) => {
      const shifts = [...target.cell.shifts]
        .map((shift) =>
          [
            shift.id,
            shift.start,
            shift.end,
            shift.role,
            shift.staffId ?? "open",
            shift.departmentId ?? "",
            shift.breakMinutes,
            shift.status,
          ].join(":"),
        )
        .sort()
        .join(",");
      return `${target.key.row}#${target.key.day}=${shifts}`;
    })
    .sort()
    .join("|");
}

export function buildFreshPlanSignature(
  targets: readonly RotaBulkTarget[],
  shifts: readonly DraftShift[],
): string {
  return buildPlanSignature(
    targets.map((target) => ({
      ...target,
      cell: {
        ...target.cell,
        shifts: shifts.filter(
          (shift) => shift.dayIndex === target.key.day && shift.staffId === target.staffId,
        ),
      },
    })),
  );
}

export function buildBulkPlan(
  kind: RotaBulkKind,
  cells: RotaBulkCellPlan[],
  blockers: RotaBulkBlocker[],
  notes: string[],
  targets: readonly RotaBulkTarget[],
): RotaBulkPlan {
  const applicable = cells.filter((cell) => cell.ops.length > 0 || cell.warnings.length > 0);
  return {
    kind,
    cells: applicable,
    blockers,
    notes,
    signature: buildPlanSignature(targets),
    counts: countBulkPlan(applicable),
  };
}

export function planIsApplicable(plan: RotaBulkPlan): boolean {
  return plan.blockers.length === 0 && plan.counts.shifts > 0;
}
