import * as React from "react";
import { AlertTriangle, Flag } from "lucide-react";
import { ActionButton, DialogShell, FormRow } from "@/components/dl";

interface Props {
  open: boolean;
  onClose: () => void;
  targetDescription: string;
  onConfirm: (note: string) => Promise<void> | void;
  isSubmitting?: boolean;
}

export function TimeFlagDialog({
  open,
  onClose,
  targetDescription,
  onConfirm,
  isSubmitting = false,
}: Props) {
  const [note, setNote] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setNote("");
      setError(null);
    }
  }, [open]);

  const handleConfirm = async () => {
    const trimmed = note.trim();
    if (!trimmed) {
      setError("Please provide a short note explaining why this entry is flagged for review.");
      return;
    }
    setError(null);
    await onConfirm(trimmed);
    onClose();
  };

  return (
    <DialogShell
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title="Flag for review"
      description={`Flagging ${targetDescription} for manager attention. No staff notification is sent.`}
      icon={Flag}
      iconTone="warning"
      footer={
        <>
          <ActionButton variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </ActionButton>
          <ActionButton size="sm" onClick={handleConfirm} disabled={isSubmitting || !note.trim()}>
            <AlertTriangle className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            {isSubmitting ? "Flagging…" : "Flag for review"}
          </ActionButton>
        </>
      }
    >
      <div className="space-y-3">
        <FormRow
          label="Review note"
          required
          htmlFor="flag-review-note"
          hint={
            error
              ? undefined
              : "Explain what requires attention (e.g. unverified overtime, missing break)."
          }
        >
          <textarea
            id="flag-review-note"
            className="textarea w-full"
            rows={3}
            placeholder="e.g. Unexplained overtime; check break timing with supervisor"
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              if (error) setError(null);
            }}
            disabled={isSubmitting}
            autoFocus
          />
        </FormRow>

        {error && (
          <p className="text-xs font-medium text-danger" role="alert">
            {error}
          </p>
        )}

        <p className="text-xs text-muted-foreground">
          Flagged timesheets appear in Needs Attention. Clock records and approval states remain
          untouched.
        </p>
      </div>
    </DialogShell>
  );
}
