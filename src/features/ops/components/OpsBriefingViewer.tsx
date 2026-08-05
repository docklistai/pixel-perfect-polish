import { Check, FileText, Printer } from "lucide-react";
import { ActionButton, DialogShell, StatusBadge } from "@/components/dl";
import type { OpsBriefing, OpsLinkableEntry } from "../types";
import { formatOpsDateTime } from "../lib/opsPresentation";
import { printOpsBriefing } from "../lib/opsPrint";
import { recipientForActor } from "../lib/opsRecipients";

export function OpsBriefingViewer(props: {
  briefing: OpsBriefing;
  actorMembershipId: string;
  entries: OpsLinkableEntry[];
  pending: boolean;
  onClose: () => void;
  onAcknowledge: (id: string) => Promise<boolean>;
  onOpenEntry: (id: string) => void;
}) {
  const mine = recipientForActor(props.briefing.recipients, props.actorMembershipId);
  return (
    <DialogShell
      open
      onOpenChange={(open) => !open && props.onClose()}
      title={props.briefing.title}
      description={`${props.briefing.locationName} · ${formatOpsDateTime(props.briefing.createdAt)}`}
      icon={FileText}
      iconTone="purple"
      size="lg"
      footer={
        <>
          <ActionButton
            variant="outline"
            icon={Printer}
            onClick={() => printOpsBriefing(props.briefing)}
          >
            Print
          </ActionButton>
          <ActionButton variant="ghost" onClick={props.onClose}>
            Close
          </ActionButton>
          {mine && !mine.acknowledgedAt && (
            <ActionButton
              icon={Check}
              disabled={props.pending}
              onClick={() => props.onAcknowledge(props.briefing.id)}
            >
              Acknowledge
            </ActionButton>
          )}
        </>
      }
    >
      <article className="space-y-4 print:p-6">
        <p className="whitespace-pre-wrap text-sm leading-6">{props.briefing.summary}</p>
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Recipients
          </h3>
          <div className="flex flex-wrap gap-2">
            {props.briefing.recipients.map((recipient) => (
              <StatusBadge
                key={recipient.membershipId}
                tone={recipient.acknowledgedAt ? "success" : recipient.readAt ? "info" : "muted"}
              >
                {recipient.name} ·{" "}
                {recipient.acknowledgedAt ? "acknowledged" : recipient.readAt ? "read" : "unread"}
              </StatusBadge>
            ))}
          </div>
        </div>
        {props.briefing.entryIds.length > 0 && (
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Linked Ops items
            </h3>
            {props.briefing.entryIds.map((id) => (
              <button
                key={id}
                type="button"
                className="link mr-3 text-sm"
                onClick={() => props.onOpenEntry(id)}
              >
                {props.entries.find((item) => item.id === id)?.title ?? id}
              </button>
            ))}
          </div>
        )}
      </article>
    </DialogShell>
  );
}
