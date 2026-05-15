import type {
  DraftShift,
  RotaGridCell,
  RotaGridOpenRow,
  RotaGridStaffRow,
  StaffId,
  StaffMember,
} from "../types";
import { DAY_COUNT } from "./draftShiftCore";

function emptyCells(): RotaGridCell[] {
  return Array.from({ length: DAY_COUNT }, () => ({ shifts: [] }));
}

function partitionByStaffAndDay(shifts: DraftShift[]): {
  byStaff: Map<StaffId, RotaGridCell[]>;
  open: RotaGridCell[];
} {
  const byStaff = new Map<StaffId, RotaGridCell[]>();
  const open = emptyCells();
  for (const shift of shifts) {
    if (shift.staffId === null) {
      open[shift.dayIndex]?.shifts.push(shift);
      continue;
    }
    let cells = byStaff.get(shift.staffId);
    if (!cells) {
      cells = emptyCells();
      byStaff.set(shift.staffId, cells);
    }
    cells[shift.dayIndex]?.shifts.push(shift);
  }
  return { byStaff, open };
}

export function buildStaffRows(
  staff: StaffMember[],
  draftShifts: DraftShift[],
): RotaGridStaffRow[] {
  const { byStaff } = partitionByStaffAndDay(draftShifts);
  return staff.map((member) => ({
    kind: "staff",
    staff: member,
    cells: byStaff.get(member.id) ?? emptyCells(),
  }));
}

export function buildOpenRow(draftShifts: DraftShift[]): RotaGridOpenRow {
  const { open } = partitionByStaffAndDay(draftShifts);
  return { kind: "open", cells: open };
}
