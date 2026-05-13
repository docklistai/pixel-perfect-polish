import { DialogShell, ActionButton } from "@/components/dl";

export function UnavailableFeatureDialog({
  feature,
  onClose,
}: {
  feature: string | null;
  onClose: () => void;
}) {
  return (
    <DialogShell
      open={!!feature}
      onOpenChange={(o) => !o && onClose()}
      title={feature ?? ""}
      description="This feature is not available yet."
      size="sm"
      footer={<ActionButton onClick={onClose}>Got it</ActionButton>}
    >
      <p className="text-sm text-muted-foreground">
        {feature} will be available in an upcoming release.
      </p>
    </DialogShell>
  );
}
