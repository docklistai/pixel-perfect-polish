/**
 * Live Team types. These mirror the `rpc_team_read_page` read model from the
 * Phase 55 migration exactly — there is no fixture shape left in this file.
 *
 * The RPC coalesces every nested collection to `[]`, so the arrays below are
 * non-optional; `normaliseTeamPage` re-asserts that at the boundary rather than
 * trusting it, because a null array is what crashed the Ops route in Phase 50.
 */

export type Tone = "purple" | "warning" | "info" | "success" | "danger" | "muted";

export const toneBg: Record<Tone, string> = {
  purple: "bg-accent-purple-soft text-accent-purple",
  warning: "bg-warning-soft text-warning",
  info: "bg-info-soft text-info",
  success: "bg-success-soft text-success",
  danger: "bg-danger-soft text-danger",
  muted: "bg-muted text-muted-foreground",
};

/** Server-side audience kinds. A client never sends recipient ids. */
export type TeamAudienceKind = "all_staff" | "department" | "managers";

export type TeamRecipientStatus = "unread" | "read" | "acknowledged";

export interface TeamAudience {
  kind: TeamAudienceKind;
  departmentId: string | null;
  label: string;
  memberCount: number;
}

export interface TeamAnnouncementRecipient {
  membershipId: string;
  staffMemberId: string | null;
  name: string;
  roleName: string | null;
  status: TeamRecipientStatus;
}

export interface TeamAnnouncementComment {
  id: string;
  body: string;
  createdAt: string;
  authorName: string | null;
}

export interface TeamAnnouncement {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  audienceKind: TeamAudienceKind;
  audienceDepartmentId: string | null;
  audienceLabel: string;
  requiresAcknowledgement: boolean;
  highlightInUpdates: boolean;
  publishedAt: string;
  authorName: string | null;
  recipientCount: number;
  readCount: number;
  acknowledgedCount: number;
  viewerAcknowledged: boolean;
  viewerIsRecipient: boolean;
  recipients: TeamAnnouncementRecipient[];
  comments: TeamAnnouncementComment[];
}

export interface TeamTrainingAssignee {
  staffMemberId: string;
  name: string;
  completed: boolean;
}

export interface TeamTrainingReminder {
  id: string;
  title: string;
  source: "manager_reminder" | "staff_records";
  audienceKind: TeamAudienceKind;
  audienceLabel: string;
  dueAt: string;
  mandatory: boolean;
  status: "open" | "completed" | "cancelled";
  note: string | null;
  assignedCount: number;
  completedCount: number;
  assignees: TeamTrainingAssignee[];
}

export interface TeamBirthday {
  staffMemberId: string;
  name: string;
  /** Day and month only — the birth year is never stored (ADR-0004). */
  birthDay: number;
  birthMonth: number;
  /** Calendar occurrence selected by the backend's -7/+21 reminder window. */
  occurrenceDate: string;
  /** Operational occurrence year only - never a birth year or age source. */
  occurrenceYear: number;
  acknowledged: boolean;
}

export interface TeamStaffEvent {
  id: string;
  title: string;
  occursAt: string;
}

export interface TeamPageData {
  announcements: TeamAnnouncement[];
  trainingReminders: TeamTrainingReminder[];
  birthdays: TeamBirthday[];
  staffEvents: TeamStaffEvent[];
  audiences: TeamAudience[];
}

/** Presentation-only shape for the three header cards. */
export interface TeamKpi {
  value: string;
  label: string;
  sub: string;
  tone: Tone;
}

export type TabKey = "all" | "pinned" | "awaitingAck";

export const ALL_AUDIENCES = "All audiences";

/** Roster row returned by `rpc_team_export_announcement_roster`. */
export interface TeamRosterRow {
  displayName: string | null;
  roleName: string | null;
  departmentName: string | null;
  deliveredAt: string | null;
  readAt: string | null;
  acknowledgedAt: string | null;
  status: TeamRecipientStatus;
}
