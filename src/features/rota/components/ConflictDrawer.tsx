import { DrawerShell, FormSection, DetailRow, StatusBadge, ActionButton } from "@/components/dl";

export function ConflictDrawer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  return (
    <DrawerShell
      open={open}
      onOpenChange={onOpenChange}
      title="Rota conflicts"
      description="2 conflicts detected this week."
      meta={<StatusBadge tone="warning">2 issues</StatusBadge>}
      footer={<ActionButton onClick={() => onOpenChange(false)}>Close</ActionButton>}
    >
      <FormSection title="Issues">
        <dl className="divide-y divide-border">
          <DetailRow label="Sophie Carter" value="Double-booked Sat 17 May · 12:00–18:00" />
          <DetailRow label="Daniel Mitchell" value="Below 11h rest break (Fri → Sat)" />
        </dl>
      </FormSection>
      <p className="text-[11px] text-muted-foreground">
        Resolve conflicts before publishing. UK working-time rules applied.
      </p>
    </DrawerShell>
  );
}
