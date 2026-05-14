import { ActionButton, DialogShell, FormSection, StatusBadge } from "@/components/dl";

export function CopyLastWeekDialog({
  open,
  onOpenChange,
  weekLabel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  weekLabel: string;
}) {
  return (
    <DialogShell
      open={open}
      onOpenChange={onOpenChange}
      title="Copy last week"
      description={`Real copy last week needs saved rota history for the week of ${weekLabel}.`}
      size="sm"
      footer={
        <ActionButton variant="secondary" onClick={() => onOpenChange(false)}>
          Close
        </ActionButton>
      }
    >
      <FormSection title="What this will do">
        <div className="space-y-2 rounded-xl border border-border bg-muted/30 px-3 py-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="font-semibold">Previous week shifts</span>
            <StatusBadge tone="muted">Backend later</StatusBadge>
          </div>
          <p className="text-xs text-muted-foreground">
            Real copy last week needs saved rota history. This screen stays as a planning note until
            that data exists.
          </p>
          <p className="text-xs text-muted-foreground">
            It will not publish anything or notify staff without a manager review step.
          </p>
        </div>
      </FormSection>
    </DialogShell>
  );
}
