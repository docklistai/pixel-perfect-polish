import {
  ALL_AUDIENCES,
  type TabKey,
  type TeamAnnouncement,
  type TeamKpi,
  type TeamPageData,
  type TeamStaffEvent,
  type TeamTrainingReminder,
} from "../types";

/**
 * Re-asserts the read model's array contract at the boundary. The RPC already
 * coalesces every collection to `[]`, but a shape regression there previously
 * took out a whole route, so the frontend does not take it on trust.
 */
export function normaliseTeamPage(raw: Partial<TeamPageData> | null | undefined): TeamPageData {
  return {
    announcements: (raw?.announcements ?? []).map((announcement) => ({
      ...announcement,
      recipients: announcement.recipients ?? [],
      comments: announcement.comments ?? [],
    })),
    trainingReminders: (raw?.trainingReminders ?? []).map((reminder) => ({
      ...reminder,
      assignees: reminder.assignees ?? [],
    })),
    birthdays: raw?.birthdays ?? [],
    staffEvents: raw?.staffEvents ?? [],
    audiences: raw?.audiences ?? [],
  };
}

export const EMPTY_TEAM_PAGE: TeamPageData = {
  announcements: [],
  trainingReminders: [],
  birthdays: [],
  staffEvents: [],
  audiences: [],
};

/** Stable option key for an audience: a kind plus at most one department id. */
export function audienceKey(audience: { kind: string; departmentId: string | null }): string {
  return `${audience.kind}:${audience.departmentId ?? ""}`;
}

/** An announcement is "awaiting acknowledgement" only if it asked for one. */
export function isAwaitingAcknowledgement(announcement: TeamAnnouncement): boolean {
  return (
    announcement.requiresAcknowledgement &&
    announcement.acknowledgedCount < announcement.recipientCount
  );
}

export function hasUnreadRecipients(announcement: TeamAnnouncement): boolean {
  return announcement.readCount < announcement.recipientCount;
}

/**
 * The three header cards, derived per render from the live rows. Nothing here
 * is stored or cached — the numbers cannot drift from the list beneath them.
 */
export function buildTeamKpis(announcements: TeamAnnouncement[]): TeamKpi[] {
  const withUnread = announcements.filter(hasUnreadRecipients);
  const awaitingAck = announcements.filter(isAwaitingAcknowledgement);
  const staffStillToRead = withUnread.reduce(
    (total, announcement) => total + (announcement.recipientCount - announcement.readCount),
    0,
  );
  const staffStillToAck = awaitingAck.reduce(
    (total, announcement) => total + (announcement.recipientCount - announcement.acknowledgedCount),
    0,
  );

  return [
    {
      value: String(withUnread.length),
      label: withUnread.length === 1 ? "Announcement unread" : "Announcements unread",
      sub:
        staffStillToRead === 0
          ? "Everyone is up to date"
          : `${staffStillToRead} ${staffStillToRead === 1 ? "person" : "people"} still to read`,
      tone: "purple",
    },
    {
      value: String(awaitingAck.length),
      label: "Awaiting acknowledgement",
      sub:
        staffStillToAck === 0
          ? "No confirmations outstanding"
          : `${staffStillToAck} ${staffStillToAck === 1 ? "confirmation" : "confirmations"} outstanding`,
      tone: "warning",
    },
    {
      value: String(announcements.length),
      label: announcements.length === 1 ? "Published update" : "Published updates",
      sub: announcements.length === 0 ? "Nothing published yet" : "Sent to your team",
      tone: "success",
    },
  ];
}

export function countByTab(announcements: TeamAnnouncement[]): Record<TabKey, number> {
  return {
    all: announcements.length,
    pinned: announcements.filter((announcement) => announcement.pinned).length,
    awaitingAck: announcements.filter(isAwaitingAcknowledgement).length,
  };
}

export function filterAnnouncements(
  announcements: TeamAnnouncement[],
  tab: TabKey,
  audienceLabel: string,
): TeamAnnouncement[] {
  return announcements
    .filter((announcement) => {
      if (tab === "pinned") return announcement.pinned;
      if (tab === "awaitingAck") return isAwaitingAcknowledgement(announcement);
      return true;
    })
    .filter(
      (announcement) =>
        audienceLabel === ALL_AUDIENCES || announcement.audienceLabel === audienceLabel,
    );
}

export function upcomingEvents(events: TeamStaffEvent[]): TeamStaffEvent[] {
  return [...events].sort((a, b) => a.occursAt.localeCompare(b.occursAt));
}

export function trainingCompletionLabel(reminder: TeamTrainingReminder): string {
  return `${reminder.completedCount} / ${reminder.assignedCount}`;
}
