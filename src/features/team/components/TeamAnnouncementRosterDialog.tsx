import { Check, Users } from "lucide-react";
import { DialogShell, ActionButton } from "@/components/dl";
import type { TeamAnnouncement, TeamAnnouncementRecipient } from "../types";

interface Props {
  announcement: TeamAnnouncement;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function RecipientRow({ recipient }: { recipient: TeamAnnouncementRecipient }) {
  const done = recipient.status === "acknowledged";
  return (
    <div className="flex items-center gap-2 p-2 bg-muted/10 border border-border/40 rounded-lg">
      {done ? (
        <Check className="h-3.5 w-3.5 text-success shrink-0" aria-hidden />
      ) : (
        <div className="h-3.5 w-3.5 rounded-full border border-warning shrink-0" aria-hidden />
      )}
      <div className="min-w-0">
        <div className="text-xs font-semibold text-foreground truncate">{recipient.name}</div>
        <div className="text-[10px] text-muted-foreground truncate">
          {recipient.roleName ?? (recipient.status === "read" ? "Read" : "Not yet read")}
        </div>
      </div>
    </div>
  );
}

/**
 * The real recipient roster. Manager-only by RLS: a staff member can read only
 * their own delivery row, never this list.
 */
export function TeamAnnouncementRosterDialog({ announcement, open, onOpenChange }: Props) {
  const acknowledged = announcement.recipients.filter(
    (recipient) => recipient.status === "acknowledged",
  );
  const pending = announcement.recipients.filter(
    (recipient) => recipient.status !== "acknowledged",
  );

  return (
    <DialogShell
      open={open}
      onOpenChange={onOpenChange}
      icon={Users}
      iconTone="brand"
      title="Who has responded"
      description={`${announcement.acknowledgedCount} of ${announcement.recipientCount} people have acknowledged this announcement.`}
      size="md"
      footer={
        <ActionButton size="sm" onClick={() => onOpenChange(false)}>
          Done
        </ActionButton>
      }
    >
      <div className="space-y-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Acknowledged ({acknowledged.length})
          </div>
          {acknowledged.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nobody has acknowledged this yet.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {acknowledged.map((recipient) => (
                <RecipientRow key={recipient.membershipId} recipient={recipient} />
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Still to acknowledge ({pending.length})
          </div>
          {pending.length === 0 ? (
            <p className="text-xs text-muted-foreground">Everyone has acknowledged.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {pending.map((recipient) => (
                <RecipientRow key={recipient.membershipId} recipient={recipient} />
              ))}
            </div>
          )}
        </div>
      </div>
    </DialogShell>
  );
}
