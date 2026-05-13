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
      title="Generate rota draft"
      description={`Prepare a suggested rota for the week of ${weekLabel} without publishing changes.`}
      size="sm"
      footer={
        <>
          <ActionButton variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </ActionButton>
          <ActionButton
            icon={CalendarPlus}
            disabled
            title="Draft generation needs editable rota state before it can prepare suggestions."
          >
            Prepare draft later
          </ActionButton>
        </>
      }
    >
      <p className="text-sm text-muted-foreground">
        Draft generation will use open shifts, role coverage, staff availability, and week
        requirements to prepare a manager-reviewed rota. It will not publish anything to staff.
      </p>
    </DialogShell>
  );
}
