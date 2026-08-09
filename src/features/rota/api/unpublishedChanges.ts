/**
 * Whether a rota week still has work the manager has not published.
 *
 * Extracted from `rotaLiveData.ts` unchanged in meaning so the decision can be
 * tested directly, and because Phase 53 gave it a second input it did not have
 * before.
 *
 * WHY A SECOND INPUT. Until Phase 53, a published week's conflict set could only
 * change when that week's own shifts changed, so "did this week's rows change
 * since the snapshot" was a complete answer. Phase 53 made overlap authority
 * workspace-wide: a week can now acquire a real, visible conflict because a
 * shift in an ADJACENT WEEK or at ANOTHER LOCATION was created or edited. That
 * left a published week showing "1 conflict" with the publish control disabled
 * and no way to acknowledge it.
 *
 * WHY CHANGE-TIME, NOT PRESENCE. Treating "a boundary conflict exists" as
 * unpublished work would keep the week dirty forever, because an acknowledged
 * external conflict does not go away — the manager deliberately published over
 * it. The week could never return to a settled state and every republish would
 * mint an identical snapshot version. So an external partner contributes only
 * while it is NEWER than the week's latest publication. Acknowledging it
 * advances `published_at` past the partner, and the week settles.
 *
 * The cost is a conservative flag when a partner is deleted and recreated
 * identically. Over-flagging asks for a review that was already warranted;
 * under-flagging is the defect this corrects.
 */

/** A row carrying the two stamps that together give its last change time. */
export type ChangeStamped = { created_at: string; updated_at: string };

/**
 * Epoch milliseconds, or 0 for anything unparseable.
 *
 * Every comparison in this module goes through here rather than comparing the
 * ISO strings directly. Lexical ordering only happens to match chronological
 * ordering while every value carries the same UTC offset, which is a property
 * of the current PostgREST session timezone rather than anything guaranteed.
 */
export function timestampValue(value: string): number {
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

/** The later of two timestamps, as the original string. */
function laterOf(left: string, right: string): string {
  return timestampValue(right) > timestampValue(left) ? right : left;
}

/**
 * A row's effective change time. `updated_at` is `not null` and maintained by
 * `shifts_set_updated_at` on UPDATE, but rows may be inserted with both stamps
 * supplied explicitly (the seed does), so the later of the two is the only
 * safe reading.
 */
export function effectiveChangeAt(row: ChangeStamped): string {
  return laterOf(row.created_at, row.updated_at);
}

export function latestShiftChangeAt(
  shifts: readonly ChangeStamped[],
  weekUpdatedAt: string,
): string {
  return shifts.reduce<string>(
    (latest, shift) => laterOf(latest, effectiveChangeAt(shift)),
    weekUpdatedAt,
  );
}

/** The latest change across matched partners, or null when there are none. */
export function latestPartnerChangeAt(partners: readonly ChangeStamped[]): string | null {
  if (partners.length === 0) return null;
  return partners.reduce<string>(
    (latest, partner) => laterOf(latest, effectiveChangeAt(partner)),
    partners[0]!.created_at,
  );
}

export function hasDraftChangedSincePublish(
  week: { status: string; updated_at: string },
  shifts: readonly ChangeStamped[],
  latestPublishedAt: string | null,
): boolean {
  if (!latestPublishedAt) return false;
  if (week.status !== "published") return true;
  return (
    timestampValue(latestShiftChangeAt(shifts, week.updated_at)) > timestampValue(latestPublishedAt)
  );
}

/**
 * True when an external overlap partner changed after this week was last
 * published — the signal that a published week needs another review.
 *
 * Null partner time means no boundary conflict at all, which is never unpublished
 * work: a conflict that disappears must not force a republish.
 */
export function hasBoundaryConflictPartnerChangedSincePublish(
  partnerChangeAt: string | null,
  latestPublishedAt: string | null,
): boolean {
  if (!partnerChangeAt || !latestPublishedAt) return false;
  return timestampValue(partnerChangeAt) > timestampValue(latestPublishedAt);
}

/**
 * The single unpublished-work decision for a live rota week.
 *
 * A persistent open operational issue counts because leave approval can require
 * a fresh publication even when the shift rows are identical.
 */
export function hasUnpublishedWork({
  week,
  shifts,
  openIssueCount,
  latestPublishedAt,
  partnerChangeAt,
}: {
  week: { status: string; updated_at: string };
  shifts: readonly ChangeStamped[];
  openIssueCount: number;
  latestPublishedAt: string | null;
  partnerChangeAt: string | null;
}): boolean {
  return (
    openIssueCount > 0 ||
    hasDraftChangedSincePublish(week, shifts, latestPublishedAt) ||
    hasBoundaryConflictPartnerChangedSincePublish(partnerChangeAt, latestPublishedAt)
  );
}
