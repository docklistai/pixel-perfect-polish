import { CalendarDays } from "lucide-react";
import { ActionButton, DialogShell, FormSection, StatusBadge } from "@/components/dl";

export function TemplatesDialog({
  open,
  onOpenChange,
  onApplyStandardTemplate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApplyStandardTemplate: () => void;
}) {
  return (
    <DialogShell
      open={open}
      onOpenChange={onOpenChange}
      title="Apply rota template"
      description="Reset this week's draft to a built-in starting pattern."
      size="sm"
      footer={
        <>
          <ActionButton variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </ActionButton>
          <ActionButton
            onClick={() => {
              onApplyStandardTemplate();
              onOpenChange(false);
            }}
          >
            Apply standard cover
          </ActionButton>
        </>
      }
    >
      <FormSection title="Standard cover">
        <div className="rounded-xl border border-border bg-muted/30 px-3 py-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-brand" aria-hidden />
            <span className="text-sm font-semibold">Balanced weekday and weekend cover</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Resets the draft to the built-in standard week pattern.
          </p>
        </div>
      </FormSection>

      <FormSection title="More templates">
        <div className="rounded-xl border border-dashed border-border px-3 py-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-semibold text-muted-foreground">Custom templates</span>
            <StatusBadge tone="muted">Pilot follow-up</StatusBadge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Save and apply your own weekly patterns — available in pilot follow-up.
          </p>
        </div>
      </FormSection>
    </DialogShell>
  );
}
