import { DrawerShell, ActionButton, FormSection, DetailRow, StatusBadge } from "@/components/dl";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DashboardAlertDrawer({ open, onOpenChange }: Props) {
  return (
    <DrawerShell
      open={open}
      onOpenChange={onOpenChange}
      title="3 shifts are understaffed"
      description="Today · Harbour View Hotel"
      meta={<StatusBadge tone="warning">Needs attention</StatusBadge>}
      footer={
        <>
          <ActionButton variant="secondary" onClick={() => onOpenChange(false)}>
            Dismiss
          </ActionButton>
          <ActionButton onClick={() => onOpenChange(false)}>Open rota</ActionButton>
        </>
      }
    >
      <FormSection title="Affected shifts">
        <dl className="divide-y divide-border">
          <DetailRow label="Bar — Evening" value="Wed 20 May · 17:00–23:00 · 2 of 3 filled" />
          <DetailRow label="Front of House" value="Wed 20 May · 12:00–20:00 · 4 of 5 filled" />
          <DetailRow label="Kitchen — Late" value="Thu 21 May · 18:00–00:00 · 3 of 4 filled" />
        </dl>
      </FormSection>
      <FormSection title="Suggested next step">
        <p className="text-xs text-muted-foreground">
          Auto-fill from your standby pool, or post these shifts as open for staff to claim.
        </p>
      </FormSection>
    </DrawerShell>
  );
}
