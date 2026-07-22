/**
 * Explains a department decision without treating it as a mistake.
 *
 * Scheduling someone outside their usual department is a normal, allowed
 * action. The manager is told what they are doing — never blocked, and never
 * warned when the choice matches the staff member's own department.
 */
export function departmentWarning({
  selectedId,
  profileDepartmentId,
  nameById,
}: {
  selectedId: string | null;
  profileDepartmentId: string | null | undefined;
  nameById: Map<string, string>;
}): string | null {
  if (!selectedId || !profileDepartmentId) return null;
  if (selectedId === profileDepartmentId) return null;
  const usual = nameById.get(profileDepartmentId);
  const scheduled = nameById.get(selectedId);
  if (!usual || !scheduled) return null;
  return `Usual department: ${usual} · Scheduled in ${scheduled}`;
}
