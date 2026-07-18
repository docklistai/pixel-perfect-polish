/**
 * Pure manager-facing copy for the portal-code issue RPCs. Kept free of
 * React/Supabase so the wording is unit-testable in the node test environment,
 * mirroring `describeBootstrapWorkspaceError` / `describeStaffWriteError`.
 *
 * The database is the sole authority for who may receive a code; this only
 * translates a raised Postgres error into plain language. It must never expose
 * internal/database terms (e.g. "membership", "seed", SQL states) to managers.
 */
export function describePortalCodeIssueError(sqlState: string | null): string {
  switch (sqlState) {
    case "42501":
      return "You don't have permission to issue access codes for this workspace.";
    case "P0002":
      return "That staff member isn't in this workspace.";
    case "55000":
      return "This staff member needs to be saved to your team before a portal code can be issued.";
    default:
      return "We couldn't issue a code. Please try again, or check the staff member with your team.";
  }
}

export function describePortalRecoveryIssueError(sqlState: string | null): string {
  switch (sqlState) {
    case "42501":
      return "You don't have permission to reset staff access for this workspace.";
    case "P0002":
      return "Choose an active staff member from this workspace.";
    case "22023":
      return "Add a short reason for the access reset.";
    case "55000":
      return "This staff member isn't eligible for an access reset. Check that their portal access is active.";
    default:
      return "We couldn't reset staff access. Please try again.";
  }
}
