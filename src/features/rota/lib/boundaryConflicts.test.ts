import { describe, expect, it } from "vitest";
import {
  boundaryConflictShiftIds,
  buildBoundaryConflictSummaries,
  withBoundaryConflictStatus,
} from "./boundaryConflicts";
import type { BoundaryOverlap } from "../api/boundaryOverlaps";
import type { DraftShift, StaffMember } from "../types";

const DAY_LABELS = [
  "Mon 8 Jun",
  "Tue 9 Jun",
  "Wed 10 Jun",
  "Thu 11 Jun",
  "Fri 12 Jun",
  "Sat 13 Jun",
  "Sun 14 Jun",
];

const ROSTER: StaffMember[] = [
  {
    id: "staff-1",
    name: "Ana Petrova",
    role: "Bartender",
    hrs: "40h",
    contractedMinutesPerWeek: 2400,
  } as StaffMember,
];

function shift(partial: Partial<DraftShift> & { id: string }): DraftShift {
  return {
    dayIndex: 0,
    staffId: "staff-1",
    role: "Bartender",
    start: "05:00",
    end: "13:00",
    breakMinutes: 30,
    tone: "info",
    status: "scheduled",
    ...partial,
  };
}

function overlap(partial: Partial<BoundaryOverlap> = {}): BoundaryOverlap {
  return {
    shiftId: "current-mon",
    otherShiftId: "other-1",
    staffMemberId: "staff-1",
    otherRotaWeekId: "week-previous",
    otherLocationId: "loc-current",
    otherDepartmentId: "dept-1",
    otherShiftDate: "2026-06-07",
    otherStart: "22:00",
    otherEnd: "06:00",
    otherLocationName: "Harbour",
    sameLocation: true,
    side: "before",
    ...partial,
  };
}

describe("boundaryConflictShiftIds", () => {
  it("collects only current-week shift ids, deduplicated", () => {
    const ids = boundaryConflictShiftIds([
      overlap(),
      overlap({ otherShiftId: "other-2" }),
      overlap({ shiftId: "current-tue", otherShiftId: "other-3" }),
    ]);

    // The external half is never a member: it is not in the week being
    // published and the manager cannot act on it from this page.
    expect([...ids].sort()).toEqual(["current-mon", "current-tue"]);
  });
});

describe("withBoundaryConflictStatus", () => {
  it("marks an affected current-week shift as a conflict", () => {
    const [marked] = withBoundaryConflictStatus([shift({ id: "current-mon" })], [overlap()]);

    expect(marked!.status).toBe("conflict");
  });

  it("leaves unaffected and open shifts exactly as they were", () => {
    const rows = [
      shift({ id: "current-tue", dayIndex: 1 }),
      shift({ id: "open-1", staffId: null, status: "open", tone: "open" }),
    ];

    expect(withBoundaryConflictStatus(rows, [overlap()])).toEqual(rows);
  });

  it("returns the same array when there is no external context", () => {
    const rows = [shift({ id: "current-mon" })];

    expect(withBoundaryConflictStatus(rows, [])).toBe(rows);
  });
});

describe("buildBoundaryConflictSummaries", () => {
  it("anchors the summary on the current-week shift so Review shift resolves", () => {
    const [summary] = buildBoundaryConflictSummaries(
      [overlap()],
      [shift({ id: "current-mon" })],
      ROSTER,
      DAY_LABELS,
    );

    expect(summary!.id).toBe("current-mon");
    expect(summary!.staff).toBe("Ana Petrova");
    expect(summary!.day).toBe("Mon 8 Jun");
    // Times read through `formatShiftTime`, the same house style the in-week
    // conflict summaries use.
    expect(summary!.detail).toContain("5am – 1pm");
    expect(summary!.detail).toContain("Sun 7 Jun 10pm – 6am");
    expect(summary!.cause).toContain("the previous rota week");
  });

  it("names the other location only when it differs", () => {
    const [sameSite] = buildBoundaryConflictSummaries(
      [overlap()],
      [shift({ id: "current-mon" })],
      ROSTER,
      DAY_LABELS,
    );
    const [otherSite] = buildBoundaryConflictSummaries(
      [overlap({ sameLocation: false, otherLocationName: "Riverside", side: "same-dates" })],
      [shift({ id: "current-mon" })],
      ROSTER,
      DAY_LABELS,
    );

    expect(sameSite!.detail).not.toContain(" at ");
    expect(otherSite!.detail).toContain("at Riverside");
    expect(otherSite!.cause).toContain("at Riverside");
  });

  it("describes a next-week partner as the next rota week", () => {
    const [summary] = buildBoundaryConflictSummaries(
      [overlap({ side: "after", otherShiftDate: "2026-06-15" })],
      [shift({ id: "current-mon" })],
      ROSTER,
      DAY_LABELS,
    );

    expect(summary!.cause).toContain("the next rota week");
  });

  it("emits one summary per affected shift when it overlaps several externals", () => {
    const summaries = buildBoundaryConflictSummaries(
      [overlap(), overlap({ otherShiftId: "other-2", otherShiftDate: "2026-06-08" })],
      [shift({ id: "current-mon" })],
      ROSTER,
      DAY_LABELS,
    );

    // ConflictSummary.id is the React key in ConflictDrawer, so two rows for one
    // shift would collide as well as overstate the tally.
    expect(summaries).toHaveLength(1);
    expect(summaries[0]!.detail).toContain("(+1 more)");
    expect(summaries[0]!.cause).toContain("2 overlapping shifts");
  });

  it("keeps a conflict whose external shift id sorts before the current one", () => {
    // The in-week builder de-duplicates pairs with `base.id < overlapping.id`.
    // Applying that here would drop roughly half of all boundary conflicts,
    // since only one side of the pair is ever in this week.
    const summaries = buildBoundaryConflictSummaries(
      [overlap({ shiftId: "zzz-current", otherShiftId: "aaa-external" })],
      [shift({ id: "zzz-current" })],
      ROSTER,
      DAY_LABELS,
    );

    expect(summaries).toHaveLength(1);
    expect(summaries[0]!.id).toBe("zzz-current");
  });

  it("skips an overlap whose current-week shift is no longer on the grid", () => {
    expect(
      buildBoundaryConflictSummaries(
        [overlap()],
        [shift({ id: "someone-else" })],
        ROSTER,
        DAY_LABELS,
      ),
    ).toEqual([]);
  });
});
