import { DrawerShell, FormSection, DetailRow, ActionButton } from "@/components/dl";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InsightDetailDrawer({ open, onOpenChange }: Props) {
  return (
    <DrawerShell
      open={open}
      onOpenChange={onOpenChange}
      title="Labour % above target"
      description="Week of 18 May 2026 · Europe/London"
      footer={<ActionButton onClick={() => onOpenChange(false)}>Close</ActionButton>}
    >
      <FormSection title="Detail">
        <dl className="divide-y divide-border">
          <DetailRow label="Actual" value="28.6%" />
          <DetailRow label="Target" value="27.0%" />
          <DetailRow label="Driver" value="Kitchen overtime, Sat" />
        </dl>
      </FormSection>
    </DrawerShell>
  );
}
