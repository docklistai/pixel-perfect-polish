import { reportServerError, toSafeBusinessMessage } from "@/lib/safe-errors";

/**
 * Re-throws a `public.shifts` write failure as an Error whose message is safe
 * to show, and useful enough to act on.
 *
 * The table carries hand-authored 55000 refusals a manager has to be able to
 * respond to — most visibly "shift assignment cannot change while time entries
 * reference the shift", which moving a shift reaches whenever somebody has
 * already clocked in against it. A raw PostgrestError loses its message in
 * server-function serialisation, so that refusal used to surface as the generic
 * "The live rota could not be saved." and left the manager with nothing to do
 * about it.
 *
 * The arbitration is the one `rpc_publish_rota_week` already relies on rather
 * than a new taxonomy: `toSafeBusinessMessage` decides whether the database's
 * own text is customer-safe, and anything else is logged server-side behind a
 * reference id.
 *
 * Lives in its own module so it can be tested without importing the server
 * functions, which cannot be constructed outside a request.
 */
export function shiftWriteError(error: unknown): Error {
  const businessMessage = toSafeBusinessMessage(error, "");
  if (businessMessage) return new Error(businessMessage);
  const failure = reportServerError(error, {
    operation: "rota.update_shift",
    fallbackMessage: "The shift could not be saved.",
  });
  return new Error(`${failure.message} Reference: ${failure.referenceId}`);
}
