import type { ExistingShiftRow } from "./rotaLiveShiftMapping";

export async function executeLiveRotaShiftDuplicate({
  shift,
  validateAssignment,
  insertCopy,
}: {
  shift: ExistingShiftRow;
  validateAssignment: (staffId: string) => Promise<unknown>;
  insertCopy: (shift: ExistingShiftRow) => Promise<string>;
}): Promise<string> {
  if (shift.staff_member_id) {
    await validateAssignment(shift.staff_member_id);
  }
  return insertCopy(shift);
}
