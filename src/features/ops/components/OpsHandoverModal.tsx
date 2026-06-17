import * as React from "react";
import { ArrowRight, FileText, FilePlus2, Send, User } from "lucide-react";
import { toast } from "sonner";
import { DialogShell, ActionButton, StatusBadge } from "@/components/dl";
import { RowActionMenu } from "@/components/RowActionMenu";
import { handoverRecipients, handoverAiDraft } from "../data/opsOverlayData";

interface OpsHandoverModalProps {
  open: boolean;
  onClose: () => void;
}

/** "Write handover note" modal — prototype parity. Demo-only, nothing is delivered. */
export function OpsHandoverModal({ open, onClose }: OpsHandoverModalProps) {
  const [recipient, setRecipient] = React.useState(handoverRecipients[0].name);
  const [notes, setNotes] = React.useState("");

  const handleHandOver = () => {
    onClose();
    toast.success("Handover note saved", {
      description: "Saved as handover note — visible to next manager on duty in the app",
    });
  };

  return (
    <DialogShell
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title="Write handover note"
      description="Snapshot for the next manager on duty"
      icon={FileText}
      iconTone="purple"
      size="lg"
      footer={
        <>
          <ActionButton variant="ghost" onClick={onClose}>
            Cancel
          </ActionButton>
          <ActionButton variant="outline" onClick={() => setNotes(handoverAiDraft)}>
            <FilePlus2 className="mr-1.5 h-3 w-3" /> Use template
          </ActionButton>
          <ActionButton onClick={handleHandOver}>
            <Send className="mr-1.5 h-3 w-3" /> Hand over to next manager
          </ActionButton>
        </>
      }
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <StatusBadge tone="brand">
          <User className="h-2.5 w-2.5" aria-hidden /> From Alex Thompson
        </StatusBadge>
        <StatusBadge tone="muted">
          <ArrowRight className="h-2.5 w-2.5" aria-hidden /> {recipient} · from today's rota
        </StatusBadge>
        <RowActionMenu
          triggerLabel="Change handover recipient"
          trigger={
            <button type="button" className="link text-xs">
              Change
            </button>
          }
          items={[
            { kind: "label", text: "Next manager on duty (from today's rota)" },
            ...handoverRecipients.map((r) => ({
              label: `${r.name} · ${r.role}`,
              onSelect: () => {
                if (r.name !== recipient) {
                  setRecipient(r.name);
                  toast.info("Recipient updated", {
                    description: `Handover will go to ${r.name}`,
                  });
                }
              },
            })),
          ]}
        />
        <div className="grow" />
        <span className="text-xs text-muted-foreground">Saved automatically</span>
      </div>

      <div className="field">
        <label htmlFor="ops-handover-notes">Notes</label>
        <textarea
          id="ops-handover-notes"
          className="textarea w-full"
          rows={9}
          placeholder="What happened on your shift, what to keep an eye on, and anything pending…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <div
        className="card mt-3 rounded-xl border p-0"
        style={{ background: "var(--st-teal-bg)", borderColor: "var(--st-teal-line)" }}
      >
        <div className="flex items-start gap-3 p-3.5">
          <FilePlus2 className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden />
          <p className="grow text-[13px] leading-normal text-muted-foreground">
            “Use template” drops in a standard handover outline you can edit. Nothing is shared
            until you hand over to the next manager.
          </p>
        </div>
      </div>
    </DialogShell>
  );
}
