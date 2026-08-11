import * as React from "react";
import { DrawerShell, ActionButton, StatusBadge } from "@/components/dl";
import { Bell, Check, Users } from "lucide-react";
import { toast } from "sonner";
import { fetchTeamAnnouncementRosterFn } from "../api/teamRead";
import { downloadRosterCsv } from "../lib/teamExport";
import { formatDate } from "../lib/teamFormatting";
import { TeamAnnouncementComments } from "./TeamAnnouncementComments";
import { TeamAnnouncementReadStatus } from "./TeamAnnouncementReadStatus";
import { TeamAnnouncementRosterDialog } from "./TeamAnnouncementRosterDialog";
import type { TeamAnnouncement } from "../types";

interface Props {
  announcement: TeamAnnouncement | null;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onAddComment: (announcementId: string, body: string) => Promise<boolean>;
  onRemind: (announcementId: string) => Promise<boolean>;
  onAcknowledge: (announcementId: string) => Promise<boolean>;
}

export function TeamAnnouncementDetailDrawer({
  announcement,
  pending,
  onOpenChange,
  onAddComment,
  onRemind,
  onAcknowledge,
}: Props) {
  const [rosterOpen, setRosterOpen] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);

  React.useEffect(() => {
    if (!announcement) setRosterOpen(false);
  }, [announcement]);

  if (!announcement) return null;

  const handleExport = async () => {
    setExporting(true);
    try {
      const rows = await fetchTeamAnnouncementRosterFn({
        data: { announcementId: announcement.id },
      });
      if (rows.length === 0) {
        toast.error("There is nobody on this announcement to export.");
        return;
      }
      downloadRosterCsv(rows, announcement.title);
      toast.success(`Exported ${rows.length} ${rows.length === 1 ? "person" : "people"}.`);
    } catch {
      toast.error("We couldn't prepare that export. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const unread = announcement.recipientCount - announcement.readCount;

  return (
    <>
      <DrawerShell
        open
        onOpenChange={(open) => !open && onOpenChange(false)}
        title={announcement.title}
        description={`${announcement.audienceLabel} · ${formatDate(announcement.publishedAt)}`}
        meta={<StatusBadge tone="brand">Announcement</StatusBadge>}
        width="lg"
        footer={
          <div className="flex w-full items-center justify-end gap-2">
            <ActionButton variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Close
            </ActionButton>
            <ActionButton
              variant="secondary"
              size="sm"
              icon={Bell}
              disabled={pending || unread === 0}
              onClick={() => void onRemind(announcement.id)}
            >
              {unread === 0 ? "All read" : `Remind ${unread}`}
            </ActionButton>
            {announcement.viewerIsRecipient && announcement.requiresAcknowledgement && (
              <ActionButton
                size="sm"
                icon={Check}
                disabled={pending || announcement.viewerAcknowledged}
                onClick={() => void onAcknowledge(announcement.id)}
              >
                {announcement.viewerAcknowledged ? "Acknowledged" : "Acknowledge"}
              </ActionButton>
            )}
          </div>
        }
      >
        <div className="space-y-5">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-brand-soft text-brand shrink-0" aria-hidden>
                <Users className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold leading-tight">{announcement.title}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {announcement.authorName
                    ? `Posted by ${announcement.authorName}`
                    : "Posted by a manager"}{" "}
                  · {formatDate(announcement.publishedAt)}
                </div>
              </div>
            </div>
            <p className="text-sm text-foreground/90 leading-relaxed bg-muted/10 p-3.5 border border-border/50 rounded-xl whitespace-pre-wrap">
              {announcement.body}
            </p>
          </div>

          <TeamAnnouncementReadStatus
            announcement={announcement}
            exporting={exporting}
            onOpenRoster={() => setRosterOpen(true)}
            onExport={() => void handleExport()}
          />

          <TeamAnnouncementComments
            comments={announcement.comments}
            pending={pending}
            onAdd={(body) => onAddComment(announcement.id, body)}
          />
        </div>
      </DrawerShell>

      <TeamAnnouncementRosterDialog
        announcement={announcement}
        open={rosterOpen}
        onOpenChange={setRosterOpen}
      />
    </>
  );
}
