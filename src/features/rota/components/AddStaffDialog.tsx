import { UserPlus } from "lucide-react";
import { ActionButton, DialogShell, FormSection, StatusBadge } from "@/components/dl";

export function AddStaffDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <DialogShell
      open={open}
      onOpenChange={onOpenChange}
      title="Add staff to rota"
      description="Staff records are managed separately from this rota planning screen."
      size="sm"
      footer={
        <ActionButton variant="secondary" onClick={() => onOpenChange(false)}>
          Close
        </ActionButton>
      }
    >
      <FormSection title="Backend later">
        <div className="rounded-xl border border-border bg-muted/30 px-3 py-3">
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-sm font-semibold">
              <UserPlus className="h-4 w-4 text-brand" aria-hidden />
              Staff directory connection
            </span>
            <StatusBadge tone="muted">Later</StatusBadge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            For this pass, managers can plan with the visible staff list. Adding new staff will
            connect to lightweight HR records in a later backend pass.
          </p>
        </div>
      </FormSection>
    </DialogShell>
  );
}
