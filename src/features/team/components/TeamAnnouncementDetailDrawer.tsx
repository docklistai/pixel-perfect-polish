import { DrawerShell, FormSection, ActionButton, StatusBadge } from "@/components/dl";
import type { TeamAnnouncement } from "../types";

interface Props {
  announcement: TeamAnnouncement | null;
  onOpenChange: (open: boolean) => void;
}

export function TeamAnnouncementDetailDrawer({ announcement, onOpenChange }: Props) {
  return (
    <DrawerShell
      open={announcement !== null}
      onOpenChange={(o) => !o && onOpenChange(false)}
      title={announcement?.t ?? ""}
      description="Posted by Alex Thompson · Europe/London"
      meta={<StatusBadge tone="info">Announcement</StatusBadge>}
      footer={
        <>
          <ActionButton variant="secondary" onClick={() => onOpenChange(false)}>
            Close
          </ActionButton>
          <ActionButton onClick={() => onOpenChange(false)}>Mark as read</ActionButton>
        </>
      }
    >
      <FormSection title="Message">
        <p className="text-sm text-foreground">{announcement?.body}</p>
      </FormSection>
      {announcement && (
        <FormSection title="Acknowledgements">
          <p className="text-xs text-muted-foreground">
            {announcement.ackDone} of {announcement.ackTotal} staff have acknowledged.
          </p>
          <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-brand"
              style={{ width: `${(announcement.ackDone / announcement.ackTotal) * 100}%` }}
            />
          </div>
        </FormSection>
      )}
    </DrawerShell>
  );
}
