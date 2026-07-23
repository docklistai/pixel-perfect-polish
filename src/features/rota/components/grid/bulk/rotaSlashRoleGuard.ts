import type { RotaBulkBlocker, RotaBulkTarget } from "./rotaBulkPlan";

/**
 * A shift role containing "/" cannot survive the cell grammar.
 *
 * "/" separates the halves of a split shift, so a role literally named
 * "Bar / Kitchen" would read back as two ranges rather than one role. Rather
 * than silently mangle it — the shift would come back wrong, or the copy would
 * paste as something the manager never wrote — every operation that has to
 * serialise or re-write such a cell refuses and names it.
 */
export const SLASH_ROLE_MESSAGE =
  'the role contains "/", which is reserved for split shifts (for example "9-12 / 17-22"). ' +
  "Rename the role, or edit this cell on its own.";

export function roleHasAmbiguousSlash(role: string | null | undefined): boolean {
  return typeof role === "string" && role.includes("/");
}

/** Every selected cell whose existing shifts carry an unusable role. */
export function findSlashRoleBlockers(targets: readonly RotaBulkTarget[]): RotaBulkBlocker[] {
  return targets
    .filter((target) => target.cell.shifts.some((shift) => roleHasAmbiguousSlash(shift.role)))
    .map((target) => ({
      label: target.label,
      message: `This cell cannot be copied or replaced in bulk: ${SLASH_ROLE_MESSAGE}`,
    }));
}
