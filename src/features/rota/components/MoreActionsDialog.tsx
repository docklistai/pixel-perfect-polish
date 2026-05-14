import {
  Copy,
  Download,
  FileText,
  Printer,
  RotateCcw,
  Share2,
  SlidersHorizontal,
} from "lucide-react";
import { ActionButton, DialogShell, FormSection } from "@/components/dl";

export function MoreActionsDialog({
  open,
  onOpenChange,
  onCopyLastWeek,
  onTemplates,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCopyLastWeek: () => void;
  onTemplates: () => void;
}) {
  const openNestedSurface = (openSurface: () => void) => {
    onOpenChange(false);
    openSurface();
  };

  return (
    <DialogShell
      open={open}
      onOpenChange={onOpenChange}
      title="Rota actions"
      description="Planning tools for this week. Backend delivery actions are labelled."
      size="md"
      footer={
        <ActionButton variant="secondary" onClick={() => onOpenChange(false)}>
          Close
        </ActionButton>
      }
    >
      <FormSection title="Planning">
        <div className="grid gap-2">
          <ActionButton
            variant="secondary"
            icon={Copy}
            onClick={() => openNestedSurface(onCopyLastWeek)}
            className="justify-start"
          >
            Copy last week (later)
          </ActionButton>
          <ActionButton
            variant="secondary"
            icon={SlidersHorizontal}
            onClick={() => openNestedSurface(onTemplates)}
            className="justify-start"
          >
            Templates
          </ActionButton>
          <ActionButton
            variant="secondary"
            icon={Printer}
            onClick={() => window.print()}
            className="justify-start"
          >
            Print rota
          </ActionButton>
        </div>
      </FormSection>

      <FormSection title="Backend later">
        <div className="space-y-2">
          <DisabledAction
            icon={Share2}
            label="Share link"
            reason="Share links need published snapshots and staff portal delivery."
          />
          <DisabledAction
            icon={Download}
            label="Export PDF"
            reason="PDF export needs the backend export service."
          />
          <DisabledAction
            icon={RotateCcw}
            label="Reset local draft"
            reason="Draft reset will be enabled after editable draft state is connected."
          />
          <DisabledAction
            icon={FileText}
            label="Publish history"
            reason="History depends on saved rota snapshots."
          />
        </div>
      </FormSection>
    </DialogShell>
  );
}

function DisabledAction({
  icon: Icon,
  label,
  reason,
}: {
  icon: typeof Share2;
  label: string;
  reason: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-muted/30 px-3 py-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
        <Icon className="h-4 w-4" aria-hidden />
        {label}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{reason}</p>
    </div>
  );
}
