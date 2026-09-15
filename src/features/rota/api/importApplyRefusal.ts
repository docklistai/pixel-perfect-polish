/**
 * Import wording for the one apply refusal that is phrased for Build.
 *
 * `rpc_internal_assert_build_week_assignable` is shared: Build the Week and
 * schedule import are validated by the same function, which is the whole point
 * of there being one write path. Its approved-leave refusal is therefore written
 * in Build's voice — "Build it again" — and an importing manager reads that at
 * the end of a drawer with no Build button in it.
 *
 * Only this one message is rewritten, and only for an import. Every other
 * refusal already reads correctly on both surfaces, and a general error-message
 * taxonomy would be a much larger change than the problem needs.
 *
 * WHEN A MANAGER SEES THIS. Approved leave is refused during preview, with the
 * person and the row named, so the ordinary path never reaches here. This is the
 * residual race: leave approved in the window between previewing and importing.
 * At that point the database has told us a refusal happened but not who it was
 * about, so this message does not pretend to know — it sends the manager back to
 * a preview that now can say.
 *
 * Lives in its own module so it can be tested without importing the server
 * functions, which cannot be constructed outside a request.
 */

/**
 * The stable part of the SQL refusal, matched rather than the whole sentence so
 * a future rewording of the Build-facing tail does not silently stop matching.
 *
 * `supabase/tests/phase66_import_pending_leave_tests.sql` asserts the database
 * still raises text containing this, so the two cannot drift apart unnoticed.
 */
export const SQL_LEAVE_REFUSAL_FRAGMENT = "has leave on that day";

export const IMPORT_LEAVE_REFUSAL_MESSAGE =
  "Someone in this import now has approved leave on a day it covers. Nothing was imported. Preview it again to see who.";

/**
 * The message to show for an apply refusal.
 *
 * `isImport` is the caller's own knowledge of which door the proposal came
 * through, not something read back out of the database's text.
 */
export function importApplyRefusalMessage(message: string, isImport: boolean): string {
  if (!isImport) return message;
  return message.includes(SQL_LEAVE_REFUSAL_FRAGMENT) ? IMPORT_LEAVE_REFUSAL_MESSAGE : message;
}
