import * as React from "react";
import { Megaphone } from "lucide-react";
import { DashboardCard, StatusBadge } from "@/components/dl";
import { cn } from "@/lib/utils";
import { usePortalTeamAnnouncements } from "../hooks/usePortalTeamAnnouncements";
import { needsAcknowledgement, type PortalTeamAnnouncement } from "../api/portalTeamAnnouncements";
import { PortalAnnouncementDrawer } from "./PortalAnnouncementDrawer";

const STAMP = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function formatStamp(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : STAMP.format(date);
}

/**
 * "Latest from your team" — the staff side of Team announcements.
 *
 * Highlighted announcements sort first and carry the portal's existing
 * brand-ring prominence treatment; that ring is the entire observable effect of
 * the manager's "Highlight in staff updates" option.
 */
export function PortalTeamUpdatesCard() {
  const announcements = usePortalTeamAnnouncements();
  const [openId, setOpenId] = React.useState<string | null>(null);

  const selected: PortalTeamAnnouncement | null =
    announcements.items.find((item) => item.id === openId) ?? null;

  const open = (announcement: PortalTeamAnnouncement) => {
    setOpenId(announcement.id);
    announcements.markRead(announcement.id);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <div className="text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
          Latest from your team
        </div>
        {announcements.awaitingCount > 0 && (
          <StatusBadge tone="warning">{announcements.awaitingCount} to confirm</StatusBadge>
        )}
      </div>

      {announcements.isLoading ? (
        <DashboardCard className="p-5 text-center">
          <p role="status" className="text-xs text-muted-foreground">
            Loading your team updates…
          </p>
        </DashboardCard>
      ) : announcements.isError ? (
        <DashboardCard className="p-5 text-center">
          <div className="text-sm font-semibold">Updates are unavailable</div>
          <button
            type="button"
            onClick={announcements.retry}
            className="mt-2 text-[11px] font-semibold text-brand hover:underline"
          >
            Try again
          </button>
        </DashboardCard>
      ) : announcements.items.length === 0 ? (
        <DashboardCard className="p-5 text-center">
          <div className="text-sm font-semibold">Nothing here yet</div>
          <p className="mt-1 text-xs text-muted-foreground">
            Announcements from your manager will appear here.
          </p>
        </DashboardCard>
      ) : (
        <div className="space-y-2">
          {announcements.items.map((announcement) => (
            <button
              key={announcement.id}
              type="button"
              onClick={() => open(announcement)}
              className={cn(
                "w-full rounded-2xl border bg-card p-4 text-left transition-colors hover:bg-muted/40",
                announcement.highlighted ? "border-brand/30 ring-1 ring-brand/30" : "border-border",
              )}
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                    announcement.highlighted
                      ? "bg-brand-soft text-brand"
                      : "bg-muted text-muted-foreground",
                  )}
                  aria-hidden
                >
                  <Megaphone className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold">{announcement.title}</span>
                    {announcement.readAt === null && (
                      <span
                        className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand"
                        aria-label="Unread"
                      />
                    )}
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {announcement.body}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <span className="text-[11px] text-muted-foreground">
                      {formatStamp(announcement.publishedAt)}
                    </span>
                    {needsAcknowledgement(announcement) ? (
                      <StatusBadge tone="warning">Confirm</StatusBadge>
                    ) : announcement.acknowledgedAt ? (
                      <StatusBadge tone="success">Confirmed</StatusBadge>
                    ) : null}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      <PortalAnnouncementDrawer
        announcement={selected}
        busy={announcements.busy}
        onClose={() => setOpenId(null)}
        onAcknowledge={announcements.acknowledge}
        formatStamp={formatStamp}
      />
    </div>
  );
}
