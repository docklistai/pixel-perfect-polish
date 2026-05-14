import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { ActionButton, DialogShell, FormSection, StatusBadge } from "@/components/dl";

export function WeekPickerDialog({
  open,
  onOpenChange,
  weekLabel,
  onSelectOffset,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  weekLabel: string;
  onSelectOffset: (offset: number | ((current: number) => number)) => void;
}) {
  const selectWeek = (offset: number | ((current: number) => number)) => {
    onSelectOffset(offset);
    onOpenChange(false);
  };

  return (
    <DialogShell
      open={open}
      onOpenChange={onOpenChange}
      title="Choose rota week"
      description="Move between planning weeks without leaving the rota."
      size="sm"
      footer={
        <ActionButton variant="secondary" onClick={() => onOpenChange(false)}>
          Close
        </ActionButton>
      }
    >
      <FormSection title="Current week">
        <div className="rounded-xl border border-border bg-muted/30 px-3 py-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-semibold">Week of {weekLabel}</span>
            <StatusBadge tone="warning">Draft</StatusBadge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Week changes are local to this planning view until backend snapshots are connected.
          </p>
        </div>
      </FormSection>

      <FormSection title="Quick actions">
        <div className="grid gap-2">
          <ActionButton
            variant="secondary"
            icon={Calendar}
            onClick={() => selectWeek(0)}
            className="justify-start"
          >
            Today
          </ActionButton>
          <ActionButton
            variant="secondary"
            icon={ChevronLeft}
            onClick={() => selectWeek((current) => current - 1)}
            className="justify-start"
          >
            Previous week
          </ActionButton>
          <ActionButton
            variant="secondary"
            icon={ChevronRight}
            onClick={() => selectWeek((current) => current + 1)}
            className="justify-start"
          >
            Next week
          </ActionButton>
        </div>
      </FormSection>
    </DialogShell>
  );
}
