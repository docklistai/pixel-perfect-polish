/**
 * Whether a server-backed rota action can run at all, and what to tell the
 * manager when it cannot.
 *
 * Build the Week and Import a schedule both read and write through server
 * functions against the workspace's own rota. The offline sample rota has no
 * workspace behind it, so neither can run — and saying that plainly is the
 * difference between a disabled button and a lie about the week still loading.
 *
 * Both flows ask here so their answers cannot drift apart, and so the reason a
 * manager reads is the same reason the buttons were disabled for.
 */

export type ServerActionAvailability = { available: true } | { available: false; reason: string };

export type RotaActionContext = {
  /** The workspace's own rota, rather than the offline sample one. */
  serverBacked: boolean;
  /** Live reads have settled and this week accepts edits. */
  canEdit: boolean;
};

export const BUILD_WEEK_OFFLINE_REASON =
  "Building a week runs against your workspace rota, and this is the offline sample rota. Nothing can be built here, and nothing would be saved. Sign in to a workspace to use it.";

export const IMPORT_SCHEDULE_OFFLINE_REASON =
  "Importing a schedule runs against your workspace rota, and this is the offline sample rota. Nothing can be imported here, and nothing would be saved. Sign in to a workspace to use it.";

export const NOT_EDITABLE_REASON =
  "This rota is not editable yet — it may still be loading, or already published.";

function availabilityFor(
  context: RotaActionContext,
  offlineReason: string,
): ServerActionAvailability {
  // Offline is checked first: on the sample rota there is no week to be loading
  // or published, so the editability reason would be the wrong explanation.
  if (!context.serverBacked) return { available: false, reason: offlineReason };
  if (!context.canEdit) return { available: false, reason: NOT_EDITABLE_REASON };
  return { available: true };
}

export function buildWeekAvailability(context: RotaActionContext): ServerActionAvailability {
  return availabilityFor(context, BUILD_WEEK_OFFLINE_REASON);
}

export function importScheduleAvailability(context: RotaActionContext): ServerActionAvailability {
  return availabilityFor(context, IMPORT_SCHEDULE_OFFLINE_REASON);
}
