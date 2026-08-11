import { getSupabaseBrowserClient } from "@/lib/supabase/browserClient";

/**
 * A Team announcement as the recipient sees it. Sourced from the staff-safe
 * `staff_team_announcements` view, which exposes only the caller's OWN delivery
 * row — never the roster, another member's read state, manager comments, or any
 * birthday field.
 */
export interface PortalTeamAnnouncement {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  requiresAcknowledgement: boolean;
  highlighted: boolean;
  publishedAt: string;
  readAt: string | null;
  acknowledgedAt: string | null;
}

interface AnnouncementViewRow {
  announcement_id: string;
  title: string;
  body: string;
  pinned: boolean;
  requires_acknowledgement: boolean;
  highlight_in_updates: boolean;
  published_at: string;
  read_at: string | null;
  acknowledged_at: string | null;
}

export function mapPortalTeamAnnouncement(row: AnnouncementViewRow): PortalTeamAnnouncement {
  return {
    id: row.announcement_id,
    title: row.title,
    body: row.body,
    pinned: row.pinned,
    requiresAcknowledgement: row.requires_acknowledgement,
    highlighted: row.highlight_in_updates,
    publishedAt: row.published_at,
    readAt: row.read_at,
    acknowledgedAt: row.acknowledged_at,
  };
}

/**
 * Ordering mirrors the manager's intent: highlighted first, then pinned, then
 * newest. This is the whole observable effect of "Highlight in staff updates".
 */
export function sortPortalTeamAnnouncements(
  announcements: PortalTeamAnnouncement[],
): PortalTeamAnnouncement[] {
  return [...announcements].sort((a, b) => {
    if (a.highlighted !== b.highlighted) return a.highlighted ? -1 : 1;
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return b.publishedAt.localeCompare(a.publishedAt);
  });
}

/** True when the recipient still owes an acknowledgement. */
export function needsAcknowledgement(announcement: PortalTeamAnnouncement): boolean {
  return announcement.requiresAcknowledgement && announcement.acknowledgedAt === null;
}

export async function fetchPortalTeamAnnouncements(
  workspaceId: string,
): Promise<PortalTeamAnnouncement[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("staff_team_announcements")
    .select(
      "announcement_id, title, body, pinned, requires_acknowledgement, highlight_in_updates, published_at, read_at, acknowledged_at",
    )
    .eq("workspace_id", workspaceId)
    .order("published_at", { ascending: false })
    .limit(50);

  if (error) throw error;
  return sortPortalTeamAnnouncements(
    ((data as AnnouncementViewRow[] | null) ?? []).map(mapPortalTeamAnnouncement),
  );
}
