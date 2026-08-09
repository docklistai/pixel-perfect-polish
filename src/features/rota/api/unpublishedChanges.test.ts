import { describe, expect, it } from "vitest";
import {
  effectiveChangeAt,
  hasBoundaryConflictPartnerChangedSincePublish,
  hasUnpublishedWork,
  latestPartnerChangeAt,
  latestShiftChangeAt,
} from "./unpublishedChanges";

/**
 * The confirmed Phase 53 blocker: a published week could acquire a real,
 * visible cross-week or cross-location conflict — because a shift somewhere
 * else changed — while `hasUnpublishedChanges` stayed false, leaving the
 * manager looking at "1 conflict" with the publish control disabled and no way
 * to acknowledge it.
 *
 * Every assertion below compares real timestamps. The stability case (T4/T3) is
 * the one that separates change-time invalidation from the naive "a boundary
 * conflict exists" boolean, which would leave the week dirty forever.
 */

// A published week whose own rows have not moved since it was published.
const T1 = "2026-08-01T09:00:00.000Z"; // week + own shift last touched
const T2 = "2026-08-02T09:00:00.000Z"; // first publication
const T3 = "2026-08-03T09:00:00.000Z"; // external partner appears
const T4 = "2026-08-04T09:00:00.000Z"; // acknowledged republication
const T5 = "2026-08-05T09:00:00.000Z"; // external partner edited again

const PUBLISHED_WEEK = { status: "published", updated_at: T1 };
const OWN_SHIFTS = [{ created_at: T1, updated_at: T1 }];

function work(latestPublishedAt: string | null, partnerChangeAt: string | null, extra = {}) {
  return hasUnpublishedWork({
    week: PUBLISHED_WEEK,
    shifts: OWN_SHIFTS,
    openIssueCount: 0,
    latestPublishedAt,
    partnerChangeAt,
    ...extra,
  });
}

describe("effective change time", () => {
  it("takes the later of created_at and updated_at", () => {
    expect(effectiveChangeAt({ created_at: T1, updated_at: T3 })).toBe(T3);
    // Rows may be inserted with both stamps supplied, so updated_at alone is
    // not always the later one.
    expect(effectiveChangeAt({ created_at: T3, updated_at: T1 })).toBe(T3);
  });

  it("compares as instants, not as strings", () => {
    // 23:00+01:00 is 22:00Z; 22:30Z is half an hour LATER but sorts earlier as
    // text. A lexical max returns created_at here, which is wrong.
    const created = "2026-08-03T23:00:00+01:00";
    const updated = "2026-08-03T22:30:00.000Z";
    expect(created > updated).toBe(true); // lexical order disagrees...
    expect(effectiveChangeAt({ created_at: created, updated_at: updated })).toBe(updated);
  });

  it("keeps the earlier-listed value when both stamps are the same instant", () => {
    const same = "2026-08-03T10:00:00+01:00"; // identical instant to T3
    expect(effectiveChangeAt({ created_at: same, updated_at: T3 })).toBe(same);
  });

  it("reduces partners to the latest change, or null when there are none", () => {
    expect(latestPartnerChangeAt([])).toBeNull();
    expect(
      latestPartnerChangeAt([
        { created_at: T1, updated_at: T1 },
        { created_at: T3, updated_at: T5 },
        { created_at: T2, updated_at: T2 },
      ]),
    ).toBe(T5);
  });

  it("keeps the week's own latest-change reduction intact", () => {
    expect(latestShiftChangeAt(OWN_SHIFTS, T1)).toBe(T1);
    expect(latestShiftChangeAt([{ created_at: T1, updated_at: T5 }], T1)).toBe(T5);
  });
});

describe("hasBoundaryConflictPartnerChangedSincePublish", () => {
  it("is false when there is no boundary conflict at all", () => {
    // A conflict that disappears must never force a republish.
    expect(hasBoundaryConflictPartnerChangedSincePublish(null, T2)).toBe(false);
  });

  it("is false for a week that was never published", () => {
    expect(hasBoundaryConflictPartnerChangedSincePublish(T3, null)).toBe(false);
  });

  it("is false when the partner is exactly as old as the publication", () => {
    expect(hasBoundaryConflictPartnerChangedSincePublish(T2, T2)).toBe(false);
  });
});

describe("published week with an external overlap partner", () => {
  it("1. partner created after the latest publish makes the week dirty", () => {
    expect(work(T2, T3)).toBe(true);
  });

  it("2. stays clean after an acknowledged republish while the partner is unchanged", () => {
    // THE blocker's stability case. Published at T4, partner last changed T3.
    // A naive "a conflict exists" boolean would report true here forever.
    expect(work(T4, T3)).toBe(false);
  });

  it("3. becomes dirty again when the partner is edited after that republish", () => {
    expect(work(T4, T5)).toBe(true);
  });

  it("4. a partner older than the publication never makes the week dirty", () => {
    expect(work(T2, T1)).toBe(false);
  });

  it("5. is dirty when any one of several partners changed after the publish", () => {
    const partners = [
      { created_at: T1, updated_at: T1 },
      { created_at: T1, updated_at: T5 },
    ];
    expect(work(T4, latestPartnerChangeAt(partners))).toBe(true);
  });

  it("6. is clean when every partner predates the publish", () => {
    const partners = [
      { created_at: T1, updated_at: T1 },
      { created_at: T3, updated_at: T3 },
    ];
    expect(work(T4, latestPartnerChangeAt(partners))).toBe(false);
  });

  it("7. behaves exactly as before when there are no external conflicts", () => {
    expect(work(T2, null)).toBe(false);
    expect(work(null, null)).toBe(false);
  });

  it("8. still reports the week's own changes since publication", () => {
    // Unchanged pre-existing behaviour: own shift edited after publication.
    expect(
      hasUnpublishedWork({
        week: PUBLISHED_WEEK,
        shifts: [{ created_at: T1, updated_at: T5 }],
        openIssueCount: 0,
        latestPublishedAt: T4,
        partnerChangeAt: null,
      }),
    ).toBe(true);
    // And an open operational issue still counts on its own.
    expect(
      hasUnpublishedWork({
        week: PUBLISHED_WEEK,
        shifts: OWN_SHIFTS,
        openIssueCount: 1,
        latestPublishedAt: T4,
        partnerChangeAt: null,
      }),
    ).toBe(true);
  });

  it("treats a never-published week as unchanged existing behaviour", () => {
    expect(
      hasUnpublishedWork({
        week: { status: "draft", updated_at: T5 },
        shifts: OWN_SHIFTS,
        openIssueCount: 0,
        latestPublishedAt: null,
        partnerChangeAt: T5,
      }),
    ).toBe(false);
  });

  it("treats a draft week that has a snapshot as changed, as before", () => {
    expect(
      hasUnpublishedWork({
        week: { status: "draft", updated_at: T1 },
        shifts: OWN_SHIFTS,
        openIssueCount: 0,
        latestPublishedAt: T4,
        partnerChangeAt: null,
      }),
    ).toBe(true);
  });
});
