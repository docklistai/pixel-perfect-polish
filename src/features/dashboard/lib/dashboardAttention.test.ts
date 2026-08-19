import { describe, it, expect } from "vitest";
import { buildAttentionItems, type DashboardAttentionInput } from "./dashboardAttention";

/**
 * The attention queue's rules, tested as pure data.
 *
 * Two properties matter most and are asserted repeatedly: an item exists only
 * when its count is genuinely real, and the order never depends on the data.
 */

function input(partial: Partial<DashboardAttentionInput> = {}): DashboardAttentionInput {
  return {
    weekScope: "current",
    openShifts: 0,
    pendingTimeCount: 0,
    pendingLeaveCount: 0,
    highLeave: null,
    rotaIssueCount: 0,
    rotaIssuesResolved: true,
    hasPublishedSnapshot: false,
    hasUnpublishedChanges: false,
    ...partial,
  };
}

const titles = (items: ReturnType<typeof buildAttentionItems>) => items.map((item) => item.t);

describe("buildAttentionItems — zero state", () => {
  it("returns nothing when no category is active", () => {
    expect(buildAttentionItems(input())).toEqual([]);
  });

  it("stays empty for a published week with no outstanding work", () => {
    const items = buildAttentionItems(
      input({ hasPublishedSnapshot: true, hasUnpublishedChanges: false }),
    );
    expect(items).toEqual([]);
  });
});

describe("buildAttentionItems — each signal independently", () => {
  it("surfaces open shifts alone", () => {
    const items = buildAttentionItems(input({ openShifts: 3 }));
    expect(items).toHaveLength(1);
    expect(items[0]!.t).toBe("This week has 3 open shifts");
    expect(items[0]!.route).toBe("/rota");
    expect(items[0]!.cta).toBe("Open rota");
  });

  it("surfaces pending leave alone", () => {
    const items = buildAttentionItems(input({ pendingLeaveCount: 2 }));
    expect(items).toHaveLength(1);
    expect(items[0]!.t).toBe("2 leave requests pending");
    expect(items[0]!.route).toBe("/leave");
    expect(items[0]!.cta).toBe("Review leave");
  });

  it("surfaces pending timesheets alone", () => {
    const items = buildAttentionItems(input({ pendingTimeCount: 4 }));
    expect(items).toHaveLength(1);
    expect(items[0]!.route).toBe("/time");
    expect(items[0]!.cta).toBe("Review timesheets");
  });

  it("surfaces unpublished changes alone, only once something was published", () => {
    const items = buildAttentionItems(
      input({ hasPublishedSnapshot: true, hasUnpublishedChanges: true }),
    );
    expect(items).toHaveLength(1);
    expect(items[0]!.t).toBe("This week has unpublished changes");
    expect(items[0]!.s).toBe("Your team is still seeing the last published version");
    expect(items[0]!.route).toBe("/rota");
    expect(items[0]!.cta).toBe("Review & publish");
  });

  it("never claims unpublished changes for a week that was never published", () => {
    const items = buildAttentionItems(
      input({ hasPublishedSnapshot: false, hasUnpublishedChanges: true }),
    );
    expect(items).toEqual([]);
  });

  it("surfaces a rota update required by a post-publication leave change", () => {
    const items = buildAttentionItems(
      input({ rotaIssueCount: 1, rotaIssuesResolved: true, hasPublishedSnapshot: true }),
    );
    expect(items).toHaveLength(1);
    expect(items[0]!.t).toBe("1 leave change needs a rota update");
    expect(items[0]!.s).toBe("Leave changed after this week's rota was published");
    expect(items[0]!.route).toBe("/leave");
    expect(items[0]!.cta).toBe("Review leave request");
  });
});

describe("buildAttentionItems — the two rota signals never double-report", () => {
  // An open operational issue forces hasUnpublishedChanges true server-side
  // (see hasUnpublishedWork), so without suppression one leave change would
  // produce two items describing the same cause.
  it("suppresses the generic notice while a specific rota issue is open", () => {
    const items = buildAttentionItems(
      input({
        rotaIssueCount: 2,
        rotaIssuesResolved: true,
        hasPublishedSnapshot: true,
        hasUnpublishedChanges: true,
      }),
    );
    expect(items).toHaveLength(1);
    expect(items[0]!.t).toBe("2 leave changes need a rota update");
  });

  it("shows the generic notice again once the issues are cleared", () => {
    const items = buildAttentionItems(
      input({
        rotaIssueCount: 0,
        rotaIssuesResolved: true,
        hasPublishedSnapshot: true,
        hasUnpublishedChanges: true,
      }),
    );
    expect(titles(items)).toEqual(["This week has unpublished changes"]);
  });
});

describe("buildAttentionItems — an unresolved read never reads as zero", () => {
  it("omits the rota issue item while the read is unresolved", () => {
    const items = buildAttentionItems(
      input({ rotaIssueCount: 5, rotaIssuesResolved: false, hasPublishedSnapshot: true }),
    );
    expect(items).toEqual([]);
  });

  it("falls back to the still-true generic notice while unresolved", () => {
    const items = buildAttentionItems(
      input({
        rotaIssueCount: 3,
        rotaIssuesResolved: false,
        hasPublishedSnapshot: true,
        hasUnpublishedChanges: true,
      }),
    );
    expect(titles(items)).toEqual(["This week has unpublished changes"]);
  });
});

describe("buildAttentionItems — deterministic order", () => {
  it("orders rota update, open shifts, leave, timesheets", () => {
    const items = buildAttentionItems(
      input({
        rotaIssueCount: 1,
        rotaIssuesResolved: true,
        hasPublishedSnapshot: true,
        hasUnpublishedChanges: true,
        openShifts: 2,
        pendingLeaveCount: 1,
        pendingTimeCount: 3,
      }),
    );
    expect(titles(items)).toEqual([
      "1 leave change needs a rota update",
      "This week has 2 open shifts",
      "1 leave request pending",
      "3 timesheets need manager review",
    ]);
  });

  it("orders open shifts, unpublished, leave, timesheets when no issue is open", () => {
    const items = buildAttentionItems(
      input({
        hasPublishedSnapshot: true,
        hasUnpublishedChanges: true,
        openShifts: 1,
        pendingLeaveCount: 2,
        pendingTimeCount: 1,
      }),
    );
    expect(titles(items)).toEqual([
      "This week has 1 open shift",
      "This week has unpublished changes",
      "2 leave requests pending",
      "1 timesheet need manager review",
    ]);
  });

  it("keeps the same order when only the middle categories are active", () => {
    const items = buildAttentionItems(
      input({ hasPublishedSnapshot: true, hasUnpublishedChanges: true, pendingTimeCount: 1 }),
    );
    expect(titles(items)).toEqual([
      "This week has unpublished changes",
      "1 timesheet need manager review",
    ]);
  });
});

describe("buildAttentionItems — counts and copy", () => {
  it("uses singular nouns for exactly one", () => {
    const items = buildAttentionItems(input({ openShifts: 1, pendingLeaveCount: 1 }));
    expect(items[0]!.t).toBe("This week has 1 open shift");
    expect(items[1]!.t).toBe("1 leave request pending");
  });

  it("agrees the verb with the rota issue count", () => {
    expect(
      buildAttentionItems(input({ rotaIssueCount: 1, rotaIssuesResolved: true }))[0]!.t,
    ).toContain("needs a rota update");
    expect(
      buildAttentionItems(input({ rotaIssueCount: 4, rotaIssuesResolved: true }))[0]!.t,
    ).toContain("need a rota update");
  });

  it("follows the watched week's noun for the demo store's next-week scope", () => {
    const items = buildAttentionItems(
      input({ weekScope: "next", hasPublishedSnapshot: true, hasUnpublishedChanges: true }),
    );
    expect(items[0]!.t).toBe("Next week has unpublished changes");
    expect(items[0]!.detail).toContain("Next week's draft");
  });

  it("names the person behind a high-impact leave request", () => {
    const items = buildAttentionItems(
      input({ pendingLeaveCount: 3, highLeave: { n: "Jordan Vale", date: "8 – 9 Jun" } }),
    );
    expect(items[0]!.t).toBe("1 leave request — high coverage impact");
    expect(items[0]!.s).toBe("Jordan Vale · 8 – 9 Jun");
  });

  it("carries no severity, score or urgency language", () => {
    const items = buildAttentionItems(
      input({
        rotaIssueCount: 2,
        rotaIssuesResolved: true,
        openShifts: 1,
        pendingLeaveCount: 1,
        pendingTimeCount: 1,
      }),
    );
    const prose = items.map((item) => `${item.t} ${item.s} ${item.detail}`).join(" ");
    expect(prose).not.toMatch(/urgent|critical|risk|score|immediately|overdue/i);
  });
});

describe("buildAttentionItems — every item is actionable", () => {
  it("gives each item a route, a CTA, a tag and detail", () => {
    const items = buildAttentionItems(
      input({
        rotaIssueCount: 1,
        rotaIssuesResolved: true,
        openShifts: 1,
        pendingLeaveCount: 1,
        pendingTimeCount: 1,
      }),
    );
    expect(items).toHaveLength(4);
    for (const item of items) {
      expect(item.route).toBeTruthy();
      expect(item.cta).toBeTruthy();
      expect(item.tag).toBeTruthy();
      expect(item.detail).toBeTruthy();
    }
    expect(items.map((item) => item.route)).toEqual(["/leave", "/rota", "/leave", "/time"]);
  });
});
