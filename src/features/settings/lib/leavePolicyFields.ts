import type { SaveLeavePolicyInput, WorkspaceLeavePolicy } from "../api/leavePolicy";

/** Editable string state for the workspace leave policy form. */
export type LeavePolicyFields = {
  /** "" = leave year not configured; otherwise "1".."12". */
  leaveYearStartMonth: string;
  /** "" = no default stated; otherwise whole calendar days. */
  defaultAnnualLeaveDays: string;
};

export type LeavePolicyParseResult =
  | { ok: true; payload: SaveLeavePolicyInput }
  | { ok: false; message: string };

export function leavePolicyFieldsFrom(policy: WorkspaceLeavePolicy | null): LeavePolicyFields {
  return {
    leaveYearStartMonth:
      policy?.leaveYearStartMonth === null || policy?.leaveYearStartMonth === undefined
        ? ""
        : String(policy.leaveYearStartMonth),
    defaultAnnualLeaveDays:
      policy?.defaultAnnualLeaveDays === null || policy?.defaultAnnualLeaveDays === undefined
        ? ""
        : String(policy.defaultAnnualLeaveDays),
  };
}

/** Empty → null (not configured). Anything unparseable → undefined (rejected). */
function parseOptionalWholeNumber(raw: string): number | null | undefined {
  const cleaned = raw.trim();
  if (cleaned === "") return null;
  if (!/^\d+$/.test(cleaned)) return undefined;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : undefined;
}

/**
 * Validates the leave policy form.
 *
 * Both fields stay independently clearable, so a workspace can state a
 * leave-year start without committing to a default, or clear a default it no
 * longer wants pre-filled. Neither ever acquires an implicit value.
 */
export function buildLeavePolicyPayload(fields: LeavePolicyFields): LeavePolicyParseResult {
  const month = parseOptionalWholeNumber(fields.leaveYearStartMonth);
  if (month === undefined || (month !== null && (month < 1 || month > 12))) {
    return { ok: false, message: "Choose a month for the leave year to start, or leave it unset." };
  }

  const days = parseOptionalWholeNumber(fields.defaultAnnualLeaveDays);
  if (days === undefined || (days !== null && (days < 0 || days > 366))) {
    return {
      ok: false,
      message: "Default annual leave must be a whole number of calendar days between 0 and 366.",
    };
  }

  return {
    ok: true,
    payload: { leaveYearStartMonth: month, defaultAnnualLeaveDays: days },
  };
}
