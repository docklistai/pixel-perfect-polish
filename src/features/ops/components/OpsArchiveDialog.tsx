import * as React from "react";
import { Archive } from "lucide-react";
import { ActionButton, DialogShell, FormRow } from "@/components/dl";
import type { OpsEntry } from "../types";

export function OpsArchiveDialog({
  entry,
  pending,
  onClose,
  onArchive,
}: {
  entry: OpsEntry | null;
  pending: boolean;
  onClose: () => void;
  onArchive: (reason: string) => Promise<boolean>;
}) {
  const [reason, setReason] = React.useState("");
  React.useEffect(() => {
    if (entry) setReason("");
  }, [entry]);
  return (
    <DialogShell
      open={entry !== null}
      onOpenChange={(open) => !open && onClose()}
      title="Archive operational entry"
      description="Archived entries are retained with their full lifecycle history."
      icon={Archive}
      iconTone="purple"
      footer={
        <>
          <ActionButton variant="ghost" onClick={onClose}>
            Cancel
          </ActionButton>
          <ActionButton
            disabled={pending || !reason.trim()}
            onClick={async () => {
              if (await onArchive(reason)) onClose();
            }}
          >
            Archive
          </ActionButton>
        </>
      }
    >
      <p className="mb-3 text-sm">{entry?.title}</p>
      <FormRow label="Archive reason" htmlFor="ops-archive-reason">
        <textarea
          id="ops-archive-reason"
          className="textarea w-full"
          rows={3}
          maxLength={2000}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </FormRow>
    </DialogShell>
  );
}
