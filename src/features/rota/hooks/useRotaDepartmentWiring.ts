import * as React from "react";
import type { ShiftId, StaffId, StaffMember } from "../types";
import { useWorkspaceDepartments } from "./useWorkspaceDepartments";
import type { WorkspaceDepartment } from "../api/workspaceDepartments";

export type RotaDepartmentWiring = {
  departments: WorkspaceDepartment[];
  departmentsEmpty: boolean;
  nameById: Map<string, string>;
  /** A staff member's own department, used as the default for new shifts. */
  staffDepartmentId: (staffId: StaffId) => string | null;
  /** Moves a shift into a real workspace department. */
  setShiftDepartment: (shiftId: ShiftId, departmentId: string) => Promise<void>;
};

/**
 * Keeps the rota route's department wiring out of the route file, which is at
 * its size target. Nothing here changes staff records — moving a shift into a
 * department writes only to that shift.
 */
export function useRotaDepartmentWiring({
  staff,
  updateShift,
}: {
  staff: StaffMember[];
  updateShift: (shiftId: ShiftId, patch: { departmentId: string }) => void | Promise<void>;
}): RotaDepartmentWiring {
  const departmentsState = useWorkspaceDepartments();

  const departmentByStaffId = React.useMemo(() => {
    const map = new Map<string, string | null>();
    for (const member of staff) map.set(String(member.id), member.departmentId ?? null);
    return map;
  }, [staff]);

  const staffDepartmentId = React.useCallback(
    (staffId: StaffId) => departmentByStaffId.get(String(staffId)) ?? null,
    [departmentByStaffId],
  );

  const setShiftDepartment = React.useCallback(
    async (shiftId: ShiftId, departmentId: string) => {
      await updateShift(shiftId, { departmentId });
    },
    [updateShift],
  );

  return {
    departments: departmentsState.departments,
    departmentsEmpty: departmentsState.isEmpty,
    nameById: departmentsState.nameById,
    staffDepartmentId,
    setShiftDepartment,
  };
}
