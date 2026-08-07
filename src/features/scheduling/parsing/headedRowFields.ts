import { errorDiagnostic, type ParseDiagnostic } from "./parseDiagnostics";
import {
  describeResolution,
  resolveDepartmentByName,
  resolveStaffByName,
  type StaffCandidate,
} from "./exactResolvers";
import { normaliseRoleKey } from "@/features/rota/lib/scheduling/shiftSignature";
import type { HeadedImportOptions } from "./headedImportTypes";

/**
 * Reading the individual fields of one imported row.
 *
 * Each reader returns either a value or the diagnostics explaining why there
 * isn't one; none of them throws and none of them stops at the first problem,
 * because a manager fixing a paste wants the whole list of what is wrong with a
 * row rather than one item per attempt.
 *
 * Times are the one field read elsewhere — `headedTimeField` — because they
 * carry two rules rather than one: what the text means, and what makes a usable
 * shift.
 */

export type ReferenceRead = { id: string | null; diagnostic: ParseDiagnostic | null };

export type StaffRead = {
  member: StaffCandidate | null;
  diagnostic: ParseDiagnostic | null;
};

/** A blank staff cell is a deliberate open shift, never a missing value. */
export function readStaff(cell: string, options: HeadedImportOptions, row: number): StaffRead {
  const text = cell.trim();
  if (!text) return { member: null, diagnostic: null };

  const resolved = resolveStaffByName(text, options.staff);
  if (resolved.kind === "resolved") return { member: resolved.value, diagnostic: null };
  return {
    member: null,
    diagnostic: errorDiagnostic(
      resolved.kind === "ambiguous" ? "ambiguous-reference" : "unresolved-reference",
      describeResolution(resolved, "staff member", text)!,
      { row, field: "staff" },
    ),
  };
}

/**
 * Whether this person may work this row's role.
 *
 * The apply RPC refuses any assignment where the person's role does not exactly
 * match the shift's, and refuses the *whole* import with it. Catching it here
 * turns "nothing imported, one row was wrong somewhere" into a row the manager
 * can see and fix before pressing anything.
 */
export function checkStaffRole(
  member: StaffCandidate,
  roleName: string,
  row: number,
): ParseDiagnostic | null {
  if (member.roleName === undefined || member.roleName === null) return null;
  if (normaliseRoleKey(member.roleName) === normaliseRoleKey(roleName)) return null;
  return errorDiagnostic(
    "invalid-value",
    `${member.name} is down as ${member.roleName}, and this row is a ${roleName.trim()} shift. Change the role, or leave the staff column blank to import it as an open shift.`,
    { row, field: "staff" },
  );
}

export function readDepartment(
  cell: string,
  options: HeadedImportOptions,
  row: number,
): ReferenceRead {
  const text = cell.trim();
  if (!text) return { id: options.defaultDepartmentId, diagnostic: null };

  const resolved = resolveDepartmentByName(text, options.departments);
  if (resolved.kind === "resolved") return { id: resolved.value.id, diagnostic: null };
  return {
    id: options.defaultDepartmentId,
    diagnostic: errorDiagnostic(
      resolved.kind === "ambiguous" ? "ambiguous-reference" : "unresolved-reference",
      describeResolution(resolved, "department", text)!,
      { row, field: "department" },
    ),
  };
}

export function readBreakMinutes(
  cell: string,
  fallback: number,
  row: number,
): { minutes: number; diagnostic: ParseDiagnostic | null } {
  const text = cell.trim();
  if (!text) return { minutes: fallback, diagnostic: null };

  const parsed = Number(text);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 1440) {
    return {
      minutes: fallback,
      diagnostic: errorDiagnostic("invalid-value", `"${text}" is not a break length in minutes.`, {
        row,
        field: "break",
      }),
    };
  }
  return { minutes: parsed, diagnostic: null };
}
