import { DrawerShell, ActionButton, FormSection, FormRow } from "@/components/dl";

interface Props {
  item: { t: string; s: string } | null;
  onClose: () => void;
}

export function DashboardQuickActionDrawer({ item, onClose }: Props) {
  return (
    <DrawerShell
      open={!!item}
      onOpenChange={(o) => !o && onClose()}
      title={item?.t ?? ""}
      description={item?.s}
      footer={
        <>
          <ActionButton variant="secondary" onClick={onClose}>
            Cancel
          </ActionButton>
          <ActionButton onClick={onClose}>Save</ActionButton>
        </>
      }
    >
      <FormSection title="Details">
        <FormRow label="Title" required>
          <input
            className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            defaultValue={item?.t}
          />
        </FormRow>
        <FormRow label="Notes" hint="Visible to managers only.">
          <textarea
            className="min-h-20 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            placeholder="Add a note..."
          />
        </FormRow>
      </FormSection>
    </DrawerShell>
  );
}
