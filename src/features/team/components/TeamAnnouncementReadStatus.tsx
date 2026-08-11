import { Download, Users } from "lucide-react";
import { ActionButton } from "@/components/dl";
import type { TeamAnnouncement } from "../types";

interface Props {
  announcement: TeamAnnouncement;
  exporting: boolean;
  onOpenRoster: () => void;
  onExport: () => void;
}

/** Live read/acknowledge progress for one announcement. */
export function TeamAnnouncementReadStatus({
  announcement,
  exporting,
  onOpenRoster,
  onExport,
}: Props) {
  const percent =
    announcement.recipientCount === 0
      ? 0
      : (announcement.readCount / announcement.recipientCount) * 100;

  return (
    <div className="card p-4 space-y-3.5 bg-muted/20 border border-border rounded-xl">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Read
        </div>
        <span className="text-sm font-bold text-foreground">
          {announcement.readCount} / {announcement.recipientCount}
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full bg-brand rounded-full transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
      {announcement.requiresAcknowledgement && (
        <p className="text-xs text-muted-foreground">
          {announcement.acknowledgedCount} of {announcement.recipientCount} have acknowledged.
        </p>
      )}
      <div className="flex gap-2.5 pt-1">
        <ActionButton variant="secondary" size="sm" icon={Users} onClick={onOpenRoster}>
          View roster
        </ActionButton>
        <ActionButton
          variant="secondary"
          size="sm"
          icon={Download}
          onClick={onExport}
          disabled={exporting}
        >
          {exporting ? "Preparing…" : "Export"}
        </ActionButton>
      </div>
    </div>
  );
}
