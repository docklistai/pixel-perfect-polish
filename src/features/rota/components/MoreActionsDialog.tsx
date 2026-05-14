import { Printer, SlidersHorizontal } from "lucide-react";
import { ActionButton, DialogShell, FormSection } from "@/components/dl";

export function MoreActionsDialog({
  open,
  onOpenChange,
  onTemplates,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
      description="Working planning tools for this local rota."
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
    </DialogShell>
  );
}
