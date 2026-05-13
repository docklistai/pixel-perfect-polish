import { AlertTriangle } from "lucide-react";
import { ActionButton, DetailRow, DrawerShell, FormSection, StatusBadge } from "@/components/dl";

export function WorkingTimeDetailsDrawer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <DrawerShell
      open={open}
      onOpenChange={onOpenChange}
      title="Working time details"
      description="Hours risk for this rota before publishing."
      meta={<StatusBadge tone="warning">Needs review</StatusBadge>}
      footer={<ActionButton onClick={() => onOpenChange(false)}>Close</ActionButton>}
    >
      <FormSection title="Issue">
        <div className="rounded-xl border border-warning/30 bg-warning-soft px-3 py-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <AlertTriangle className="h-4 w-4 text-warning" aria-hidden />1 working time alert
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            One staff member is scheduled above the planned weekly hours threshold.
          </p>
        </div>
      </FormSection>

      <FormSection title="Why it matters">
        <dl className="divide-y divide-border">
          <DetailRow label="Risk" value="Hours risk before publish" />
          <DetailRow label="Likely action" value="Move or shorten a shift" />
          <DetailRow label="Draft editing" value="Connected in the next frontend pass" />
        </dl>
      </FormSection>
    </DrawerShell>
  );
}
