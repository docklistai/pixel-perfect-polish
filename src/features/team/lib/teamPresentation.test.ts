import { describe, expect, it } from "vitest";
import {
  EMPTY_TEAM_PAGE,
  audienceKey,
  buildTeamKpis,
  countByTab,
  filterAnnouncements,
  isAwaitingAcknowledgement,
  normaliseTeamPage,
  trainingCompletionLabel,
} from "./teamPresentation";
import { announcementIcon, announcementTone, trainingTone } from "./teamVisuals";
import { formatBirthday, relativeDays } from "./teamFormatting";
import { ALL_AUDIENCES, type TeamAnnouncement, type TeamTrainingReminder } from "../types";

function announcement(overrides: Partial<TeamAnnouncement> = {}): TeamAnnouncement {
  return {
    id: "a1",
    title: "Summer menu",
    body: "Body",
    pinned: false,
    audienceKind: "all_staff",
    audienceDepartmentId: null,
    audienceLabel: "All Staff",
    requiresAcknowledgement: true,
    highlightInUpdates: true,
    publishedAt: "2026-08-10T09:00:00Z",
    authorName: "Alex",
    recipientCount: 8,
    readCount: 6,
    acknowledgedCount: 5,
    viewerAcknowledged: false,
    viewerIsRecipient: false,
    recipients: [],
    comments: [],
    ...overrides,
  };
}

function reminder(overrides: Partial<TeamTrainingReminder> = {}): TeamTrainingReminder {
  return {
    id: "t1",
    title: "Food safety",
    source: "staff_records",
    audienceKind: "department",
    audienceLabel: "Kitchen",
    dueAt: "2026-08-13T09:00:00Z",
    mandatory: true,
    status: "open",
    note: null,
    assignedCount: 2,
    completedCount: 1,
    assignees: [],
    ...overrides,
  };
}

describe("read-model normalisation", () => {
  it("returns empty collections for a null payload rather than throwing", () => {
    expect(normaliseTeamPage(null)).toEqual(EMPTY_TEAM_PAGE);
  });

  it("coalesces nested nulls the RPC is supposed to have guaranteed", () => {
    // Defence in depth: a null nested array previously took out a whole route.
    const page = normaliseTeamPage({
      announcements: [{ ...announcement(), recipients: undefined, comments: undefined } as never],
      trainingReminders: [{ ...reminder(), assignees: undefined } as never],
    });
    expect(page.announcements[0].recipients).toEqual([]);
    expect(page.announcements[0].comments).toEqual([]);
    expect(page.trainingReminders[0].assignees).toEqual([]);
    expect(page.birthdays).toEqual([]);
    expect(page.staffEvents).toEqual([]);
    expect(page.audiences).toEqual([]);
  });
});

describe("audience keys", () => {
  it("round-trips a department audience and distinguishes the kinds", () => {
    expect(audienceKey({ kind: "all_staff", departmentId: null })).toBe("all_staff:");
    expect(audienceKey({ kind: "department", departmentId: "d1" })).toBe("department:d1");
    expect(audienceKey({ kind: "managers", departmentId: null })).not.toBe(
      audienceKey({ kind: "all_staff", departmentId: null }),
    );
  });
});

describe("acknowledgement state", () => {
  it("only counts as awaiting when an acknowledgement was actually asked for", () => {
    expect(isAwaitingAcknowledgement(announcement())).toBe(true);
    expect(
      isAwaitingAcknowledgement(
        announcement({ requiresAcknowledgement: false, acknowledgedCount: 0 }),
      ),
    ).toBe(false);
  });

  it("is satisfied once everyone has acknowledged", () => {
    expect(isAwaitingAcknowledgement(announcement({ acknowledgedCount: 8 }))).toBe(false);
  });
});

describe("KPI derivation", () => {
  it("derives all three cards from the live rows", () => {
    const kpis = buildTeamKpis([
      announcement({ id: "a1", readCount: 6, acknowledgedCount: 5 }),
      announcement({ id: "a2", readCount: 8, acknowledgedCount: 8 }),
    ]);
    expect(kpis[0].value).toBe("1");
    expect(kpis[0].sub).toBe("2 people still to read");
    expect(kpis[1].value).toBe("1");
    expect(kpis[1].sub).toBe("3 confirmations outstanding");
    expect(kpis[2].value).toBe("2");
  });

  it("reads honestly when there is nothing published", () => {
    const kpis = buildTeamKpis([]);
    expect(kpis.map((kpi) => kpi.value)).toEqual(["0", "0", "0"]);
    expect(kpis[2].sub).toBe("Nothing published yet");
    expect(kpis[0].sub).toBe("Everyone is up to date");
  });

  it("singularises rather than printing '1 people'", () => {
    const kpis = buildTeamKpis([
      announcement({ recipientCount: 2, readCount: 1, acknowledgedCount: 1 }),
    ]);
    expect(kpis[0].sub).toBe("1 person still to read");
    expect(kpis[1].sub).toBe("1 confirmation outstanding");
  });
});

describe("tabs and filters", () => {
  const rows = [
    announcement({ id: "a1", pinned: true, audienceLabel: "All Staff" }),
    announcement({ id: "a2", audienceLabel: "Kitchen", acknowledgedCount: 8, recipientCount: 8 }),
    announcement({ id: "a3", audienceLabel: "Kitchen" }),
  ];

  it("counts each tab from live rows", () => {
    expect(countByTab(rows)).toEqual({ all: 3, pinned: 1, awaitingAck: 2 });
  });

  it("filters by tab", () => {
    expect(filterAnnouncements(rows, "pinned", ALL_AUDIENCES).map((row) => row.id)).toEqual(["a1"]);
    expect(filterAnnouncements(rows, "awaitingAck", ALL_AUDIENCES).map((row) => row.id)).toEqual([
      "a1",
      "a3",
    ]);
  });

  it("filters by audience label", () => {
    expect(filterAnnouncements(rows, "all", "Kitchen").map((row) => row.id)).toEqual(["a2", "a3"]);
  });

  it("combines tab and audience", () => {
    expect(filterAnnouncements(rows, "awaitingAck", "Kitchen").map((row) => row.id)).toEqual([
      "a3",
    ]);
  });
});

describe("derived icon and tone", () => {
  it("distinguishes audiences instead of using per-fixture icons", () => {
    expect(announcementIcon(announcement({ audienceKind: "all_staff" }))).not.toBe(
      announcementIcon(announcement({ audienceKind: "department" })),
    );
    expect(announcementIcon(announcement({ audienceKind: "managers" }))).not.toBe(
      announcementIcon(announcement({ audienceKind: "all_staff" })),
    );
  });

  it("warns while an acknowledgement is outstanding", () => {
    expect(announcementTone(announcement())).toBe("warning");
    expect(announcementTone(announcement({ acknowledgedCount: 8, pinned: true }))).toBe("purple");
    expect(announcementTone(announcement({ requiresAcknowledgement: false, pinned: false }))).toBe(
      "info",
    );
  });

  it("tones training by mandatory and completion", () => {
    expect(trainingTone(reminder())).toBe("warning");
    expect(trainingTone(reminder({ mandatory: false }))).toBe("info");
    expect(trainingTone(reminder({ status: "completed" }))).toBe("success");
  });

  it("labels completion from the live counters", () => {
    expect(trainingCompletionLabel(reminder())).toBe("1 / 2");
  });
});

describe("date presentation", () => {
  it("formats a birthday with no year, because no year is stored", () => {
    expect(formatBirthday(9, 6)).toBe("9 Jun");
    expect(formatBirthday(1, 12)).toBe("1 Dec");
  });

  it("describes relative days around today", () => {
    const now = new Date("2026-08-11T12:00:00Z");
    expect(relativeDays("2026-08-11T18:00:00Z", now)).toBe("Today");
    expect(relativeDays("2026-08-12T09:00:00Z", now)).toBe("Tomorrow");
    expect(relativeDays("2026-08-14T09:00:00Z", now)).toBe("3 days");
    expect(relativeDays("2026-08-10T09:00:00Z", now)).toBe("Yesterday");
    expect(relativeDays("2026-08-08T09:00:00Z", now)).toBe("3 days ago");
  });

  it("survives an unparseable timestamp", () => {
    expect(relativeDays("not-a-date")).toBe("");
  });
});
