import { DrawerShell, FormSection, DetailRow, StatusBadge, ActionButton } from "@/components/dl";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LeaveRiskDrawer({ open, onOpenChange }: Props) {
  return (
    <DrawerShell
      open={open}
      onOpenChange={onOpenChange}
      title="Coverage risk — Bar"
      description="Sat 13 Jun 2026"
      meta={<StatusBadge tone="danger">High risk</StatusBadge>}
      footer={<ActionButton onClick={() => onOpenChange(false)}>Close</ActionButton>}
    >
      <FormSection title="Why this is flagged">
        <dl className="divide-y divide-border">
          <DetailRow label="On leave" value="2 of 4 bar staff" />
          <DetailRow label="Forecast covers" value="320 (busy Saturday)" />
          <DetailRow label="Suggested cover" value="3 bar staff" />
        </dl>
      </FormSection>
      <p className="text-[11px] text-muted-foreground">Preview only. No rota change is applied.</p>
    </DrawerShell>
  );
}
