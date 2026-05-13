import { DialogShell, ActionButton } from "@/components/dl";
import { CalendarPlus } from "lucide-react";

export function GenerateRotaDialog({
  open,
  onOpenChange,
  weekLabel,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  weekLabel: string;
}) {
  return (
    <DialogShell
      open={open}
      onOpenChange={onOpenChange}
      title="Generate rota"
      description={`Auto-fill the week of ${weekLabel} based on staff availability and role requirements.`}
      size="sm"
      footer={
        <>
          <ActionButton variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </ActionButton>
          <ActionButton icon={CalendarPlus} onClick={() => onOpenChange(false)}>
            Generate
          </ActionButton>
        </>
      }
    >
      <p className="text-sm text-muted-foreground">
        AI-assisted rota generation is coming soon. It will use contracted hours, availability, and
        role requirements to suggest a full week.
      </p>
    </DialogShell>
  );
}
