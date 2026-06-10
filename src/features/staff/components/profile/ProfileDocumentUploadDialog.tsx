import { ActionButton, DialogShell } from "@/components/dl";
import type { StaffProfileDocument } from "../../types";
import { Check, Upload } from "lucide-react";

interface Props {
  firstName: string;
  profileName: string;
  document: StaffProfileDocument | null;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
}

export function ProfileDocumentUploadDialog({
  firstName,
  profileName,
  document,
  onOpenChange,
  onSave,
}: Props) {
  return (
    <DialogShell
      open={Boolean(document)}
      onOpenChange={onOpenChange}
      title={`Upload ${document?.name ?? "document"}`}
      description={document ? `For ${profileName} · ${document.type}` : undefined}
      icon={Upload}
      size="lg"
      footer={
        <>
          <ActionButton variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </ActionButton>
          <ActionButton size="sm" onClick={onSave}>
            <Check className="h-3 w-3" aria-hidden /> Save document
          </ActionButton>
        </>
      }
    >
      <button
        type="button"
        className="flex w-full flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-[var(--bg-raised)] px-5 py-8 text-center"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/10 text-brand">
          <Upload className="h-5 w-5" aria-hidden />
        </div>
        <span className="text-sm font-semibold">Drop a file or click to browse</span>
        <span className="text-xs text-muted-foreground">PDF, JPG or PNG · max 10MB</span>
        <span className="btn secondary sm mt-1">
          <Upload className="h-3 w-3" aria-hidden /> Choose file
        </span>
      </button>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="field">
          <label htmlFor="document-issue-date">Issue date</label>
          <input id="document-issue-date" className="dl-input mono" defaultValue="12 May 2025" />
        </div>
        <div className="field">
          <label htmlFor="document-expiry">Expiry</label>
          <input id="document-expiry" className="dl-input mono" defaultValue="12 Aug 2026" />
        </div>
      </div>
      <label className="mt-3 flex items-center gap-2 text-sm">
        <input type="checkbox" defaultChecked /> Remind {firstName} 30 days before expiry
      </label>
    </DialogShell>
  );
}
