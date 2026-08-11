import { Check } from "lucide-react";
import { ActionButton, DrawerShell, StatusBadge } from "@/components/dl";
import { needsAcknowledgement, type PortalTeamAnnouncement } from "../api/portalTeamAnnouncements";

interface Props {
  announcement: PortalTeamAnnouncement | null;
  busy: boolean;
  onClose: () => void;
  onAcknowledge: (announcementId: string) => Promise<boolean>;
  formatStamp: (iso: string) => string;
}

/**
 * A staff member's view of one Team announcement. Deliberately narrow: the
 * message, when it was posted, their own state, and a confirm action when one
 * was asked for. No roster, no other recipient, no manager notes, no replies.
 */
export function PortalAnnouncementDrawer({
  announcement,
  busy,
  onClose,
  onAcknowledge,
  formatStamp,
}: Props) {
  if (!announcement) return null;

  const mustAcknowledge = needsAcknowledgement(announcement);

  return (
    <DrawerShell
      open
      onOpenChange={(open) => !open && onClose()}
      title={announcement.title}
      description={`Posted ${formatStamp(announcement.publishedAt)}`}
      meta={
        announcement.acknowledgedAt ? (
          <StatusBadge tone="success">Confirmed</StatusBadge>
        ) : mustAcknowledge ? (
          <StatusBadge tone="warning">Needs your confirmation</StatusBadge>
        ) : undefined
      }
      width="lg"
      footer={
        <div className="flex w-full items-center justify-end gap-2">
          <ActionButton variant="secondary" size="sm" onClick={onClose}>
            Close
          </ActionButton>
          {announcement.requiresAcknowledgement && (
            <ActionButton
              size="sm"
              icon={Check}
              disabled={busy || announcement.acknowledgedAt !== null}
              onClick={() => void onAcknowledge(announcement.id)}
            >
              {announcement.acknowledgedAt ? "Confirmed" : "Confirm I've read this"}
            </ActionButton>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap rounded-xl border border-border/50 bg-muted/10 p-3.5">
          {announcement.body}
        </p>

        {announcement.requiresAcknowledgement && !announcement.acknowledgedAt && (
          <p className="text-xs text-muted-foreground">
            Your manager has asked everyone to confirm they've read this.
          </p>
        )}
        {announcement.acknowledgedAt && (
          <p className="text-xs text-muted-foreground">
            You confirmed this on {formatStamp(announcement.acknowledgedAt)}.
          </p>
        )}
      </div>
    </DrawerShell>
  );
}
