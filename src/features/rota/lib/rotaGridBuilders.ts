import type {
  DraftShift,
  RotaGridCell,
  RotaGridOpenRow,
  RotaGridStaffRow,
  StaffId,
  StaffMember,
} from "../types";
import type { LeaveRequest } from "@/features/leave/types";
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
  leaveRequests: LeaveRequest[] = [],
  dayIsoDates: string[] = [],
): RotaGridStaffRow[] {
  const { byStaff } = partitionByStaffAndDay(draftShifts);
  return staff.map((member) => {
    const rawCells = byStaff.get(member.id) ?? emptyCells();
    const cells = rawCells.map((cell, index) => {
      const isoDate = dayIsoDates[index];
      if (!isoDate) return cell;
      const hasLeave = leaveRequests.some(
        (req) =>
          req.staffId === member.id &&
          req.state === "approved" &&
          req.startIso <= isoDate &&
          req.endIso >= isoDate,
      );
      return hasLeave ? { ...cell, hasLeave: true } : cell;
    });

    return {
      kind: "staff",
      staff: member,
      cells,
    };
  });
}

export function buildOpenRow(draftShifts: DraftShift[]): RotaGridOpenRow {
  const { open } = partitionByStaffAndDay(draftShifts);
  return { kind: "open", cells: open };
}
